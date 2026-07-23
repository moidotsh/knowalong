#!/usr/bin/env python3
import argparse, json, re, sqlite3, subprocess, sys, urllib.request, time
from datetime import datetime, timezone
from pathlib import Path

MODEL_DEFAULT = "qwen2.5:7b"
CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\x1b]")
CYRILLIC = re.compile(r"[\u0400-\u04ff]")
LATIN = re.compile(r"[A-Za-z]")
CLEAN_SCHEMA = {"type":"object","additionalProperties":False,"required":["russian","english","needs_review"],"properties":{"russian":{"type":"string"},"english":{"type":"string"},"needs_review":{"type":"boolean"}}}
ANALYSIS_SCHEMA = {"type":"object","additionalProperties":False,"required":["sentence_pattern","grammar_summary","needs_review","tokens"],"properties":{"sentence_pattern":{"type":"string"},"grammar_summary":{"type":"string"},"needs_review":{"type":"boolean"},"tokens":{"type":"array","items":{"type":"object","additionalProperties":False,"required":["surface","lemma","part_of_speech","english_gloss","morphology","case_or_form","governed_by","role","confidence"],"properties":{"surface":{"type":"string"},"lemma":{"type":"string"},"part_of_speech":{"type":"string"},"english_gloss":{"type":"string"},"morphology":{"type":"string"},"case_or_form":{"type":"string"},"governed_by":{"type":"string"},"role":{"type":"string"},"confidence":{"type":"string","enum":["high","medium","low"]}}}}}}
CLEAN_PROMPT = """You extract clean text from noisy OCR of a Duolingo Russian-learning card.
The OCR normally contains exactly one Russian sentence or question and its English translation. It may contain the word duolingo, standalone punctuation, flags, and illustration garbage.
Return only JSON matching the supplied schema.
Rules:
- Extract exactly one Russian sentence/question and one English translation.
- Correct unambiguous character-level OCR substitutions. Example: 'т Europe' in English must become 'in Europe'; '| ке this restaurant' must become 'I like this restaurant'.
- Do not paraphrase or improve wording.
- Do not invent missing words or reconstruct a sentence absent from OCR.
- Set needs_review true only if either sentence is materially absent, incomplete, or has more than one plausible reconstruction.
OCR follows:
"""
ANALYSIS_PROMPT = """You are a careful Russian morphology parser. Analyze the CONFIRMED Russian sentence below; never change its text or translation. Return only JSON matching the supplied schema.
Rules:
- One token object for every written Russian word, including prepositions.
- Give exactly one case/form in this sentence: never write alternatives such as nominative/accusative.
- Use ordinary dictionary headwords: в not во, о not об.
- For nouns/proper nouns: gender, animacy if applicable, number, and case.
- For adjectives, pronouns, and numerals: relevant gender/number/case and agreement.
- For verbs: infinitive, aspect, tense, person, number, mood; state agreement accurately.
- For prepositions: state the case governed in THIS use in case_or_form, and name its object in governed_by.
- governed_by must name the word/construction selecting the form (e.g. 'много', 'в', 'о', or 'agreement with книга').
- If unsure, use confidence medium/low and set needs_review true.
- Do not use terminal control characters or ANSI escape codes.
CONFIRMED RECORD:
"""
def clean(s): return CONTROL.sub('', s).strip()
def api(model, prompt, schema):
    payload=json.dumps({"model":model,"prompt":prompt,"format":schema,"stream":False,"options":{"temperature":0}}).encode()
    req=urllib.request.Request("http://127.0.0.1:11434/api/generate",data=payload,headers={"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=300) as r: result=json.loads(r.read().decode())
    except Exception as e: raise RuntimeError("Cannot reach Ollama. Open Ollama, then run `ollama pull qwen2.5:7b`. " + str(e))
    try: return json.loads(clean(result["response"]))
    except Exception as e: raise RuntimeError("Model returned invalid JSON: "+str(e))
def init_db(db):
    db.executescript("""PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS sentences (id INTEGER PRIMARY KEY,source_file TEXT UNIQUE NOT NULL,source_path TEXT NOT NULL,raw_ocr TEXT NOT NULL,russian TEXT,english TEXT,extraction_needs_review INTEGER NOT NULL,grammar_needs_review INTEGER,sentence_pattern TEXT,grammar_summary TEXT,status TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS lemmas (id INTEGER PRIMARY KEY,language TEXT NOT NULL,lemma TEXT NOT NULL,part_of_speech TEXT NOT NULL,english_gloss TEXT,notes TEXT,UNIQUE(language,lemma,part_of_speech));
CREATE TABLE IF NOT EXISTS word_forms (id INTEGER PRIMARY KEY,language TEXT NOT NULL,surface TEXT NOT NULL,lemma_id INTEGER NOT NULL REFERENCES lemmas(id),morphology TEXT,case_or_form TEXT,UNIQUE(language,surface,lemma_id,morphology,case_or_form));
CREATE TABLE IF NOT EXISTS occurrences (id INTEGER PRIMARY KEY,sentence_id INTEGER NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,token_index INTEGER NOT NULL,word_form_id INTEGER NOT NULL REFERENCES word_forms(id),governed_by TEXT,syntactic_role TEXT,confidence TEXT,UNIQUE(sentence_id,token_index));""")
def get_id(db,sql,vals): return db.execute(sql,vals).fetchone()[0]
def preview(text, limit=240):
    text = " ".join(clean(text).split())
    return text if len(text) <= limit else text[:limit-1] + "…"
def ocr(image):
    print("    OCR: Tesseract (rus+eng, PSM 11)…", flush=True)
    started=time.time()
    p=subprocess.run(["tesseract",str(image),"stdout","-l","rus+eng","--psm","11"],capture_output=True,text=True)
    if p.returncode: raise RuntimeError(p.stderr.strip())
    text=clean(p.stdout)
    print(f"    OCR: done in {time.time()-started:.1f}s | {preview(text)!r}", flush=True)
    return text
def valid_clean(x): return bool(CYRILLIC.search(x.get("russian",""))) and bool(LATIN.search(x.get("english","")))
def process(db,image,model,raw_dir,cleaned_dir,analyzed_dir,force):
    key=image.stem; print(f"\n{'─'*72}\nFILE: {image.name}", flush=True); prior=db.execute("SELECT id FROM sentences WHERE source_file=?",(image.name,)).fetchone()
    if prior and not force: print(f"SKIP {image.name} (already in database)"); return
    raw=ocr(image); raw_path=raw_dir/f"{key}.txt"; raw_path.write_text(raw+"\n",encoding="utf-8")
    print(f"    SAVE: raw OCR → {raw_path.relative_to(image.parent)}", flush=True)
    print("    CLEAN: Qwen extracting Russian + English…", flush=True)
    started=time.time(); extracted=api(model,CLEAN_PROMPT+raw,CLEAN_SCHEMA)
    print(f"    CLEAN: done in {time.time()-started:.1f}s", flush=True)
    extracted={k:clean(str(v)) if isinstance(v,str) else v for k,v in extracted.items()}
    if not valid_clean(extracted): extracted["needs_review"]=True
    cleaned_path=cleaned_dir/f"{key}.json"; cleaned_path.write_text(json.dumps(extracted,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"    CLEAN: RU={extracted['russian']!r}\n           EN={extracted['english']!r}\n           needs_review={extracted['needs_review']} → {cleaned_path.relative_to(image.parent)}", flush=True)
    db.execute("DELETE FROM sentences WHERE source_file=?",(image.name,)); now=datetime.now(timezone.utc).isoformat(); status="review" if extracted["needs_review"] else "extracted"
    sid=db.execute("INSERT INTO sentences(source_file,source_path,raw_ocr,russian,english,extraction_needs_review,status,created_at) VALUES(?,?,?,?,?,?,?,?)",(image.name,str(image.resolve()),raw,extracted["russian"],extracted["english"],int(extracted["needs_review"]),status,now)).lastrowid
    if extracted["needs_review"]: db.commit(); print(f"    RESULT: REVIEW — extraction incomplete/uncertain; stored but grammar skipped.", flush=True); return
    print("    ANALYZE: Qwen parsing lemmas, cases, and conjugations…", flush=True)
    started=time.time(); analysis=api(model,ANALYSIS_PROMPT+json.dumps(extracted,ensure_ascii=False),ANALYSIS_SCHEMA)
    print(f"    ANALYZE: done in {time.time()-started:.1f}s", flush=True)
    analysis=json.loads(clean(json.dumps(analysis,ensure_ascii=False))); analyzed_path=analyzed_dir/f"{key}.json"; analyzed_path.write_text(json.dumps(analysis,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"    ANALYZE: {len(analysis['tokens'])} Russian tokens → {analyzed_path.relative_to(image.parent)}", flush=True)
    grammar_review=bool(analysis["needs_review"]) or any(t["confidence"]!="high" for t in analysis["tokens"]); status="review" if grammar_review else "ready"
    db.execute("UPDATE sentences SET grammar_needs_review=?,sentence_pattern=?,grammar_summary=?,status=? WHERE id=?",(int(grammar_review),clean(analysis["sentence_pattern"]),clean(analysis["grammar_summary"]),status,sid))
    for i,t in enumerate(analysis["tokens"]):
        lemma,pos=clean(t["lemma"]),clean(t["part_of_speech"]); gloss=clean(t["english_gloss"])
        db.execute("INSERT OR IGNORE INTO lemmas(language,lemma,part_of_speech,english_gloss) VALUES('ru',?,?,?)",(lemma,pos,gloss)); lid=get_id(db,"SELECT id FROM lemmas WHERE language='ru' AND lemma=? AND part_of_speech=?",(lemma,pos))
        vals=('ru',clean(t["surface"]),lid,clean(t["morphology"]),clean(t["case_or_form"])); db.execute("INSERT OR IGNORE INTO word_forms(language,surface,lemma_id,morphology,case_or_form) VALUES(?,?,?,?,?)",vals); fid=get_id(db,"SELECT id FROM word_forms WHERE language=? AND surface=? AND lemma_id=? AND morphology=? AND case_or_form=?",vals)
        db.execute("INSERT INTO occurrences(sentence_id,token_index,word_form_id,governed_by,syntactic_role,confidence) VALUES(?,?,?,?,?,?)",(sid,i,fid,clean(t["governed_by"]),clean(t["role"]),t["confidence"]))
    db.commit()
    print(f"    RESULT: {status.upper()} | database updated", flush=True)
    for t in analysis["tokens"]:
        print(f"      {t['surface']:<16} → {t['lemma']:<16} | {t['case_or_form']} | {t['confidence']}", flush=True)
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("folder",nargs="?",default="."); ap.add_argument("--model",default=MODEL_DEFAULT); ap.add_argument("--db",default="language_library.sqlite"); ap.add_argument("--reprocess",action="store_true"); a=ap.parse_args()
    root=Path(a.folder).expanduser().resolve(); raw_dir=root/'raw_ocr'; cleaned_dir=root/'cleaned'; analyzed_dir=root/'analyzed'
    for d in (raw_dir,cleaned_dir,analyzed_dir): d.mkdir(exist_ok=True)
    images=sorted(p for p in root.iterdir() if p.is_file() and p.suffix.lower() in {'.png','.jpg','.jpeg','.webp'})
    if not images: sys.exit("No PNG/JPG/JPEG/WEBP images found in "+str(root))
    db=sqlite3.connect(root/a.db); init_db(db)
    print(f"\nDuolingo language library\nFolder: {root}\nImages found: {len(images)}\nModel: {a.model}\nDatabase: {root/a.db}", flush=True)
    for n,im in enumerate(images,1):
        print(f"\n[{n}/{len(images)}]", flush=True)
        try: process(db,im,a.model,raw_dir,cleaned_dir,analyzed_dir,a.reprocess)
        except Exception as e: print(f"ERROR  {im.name}: {e}",file=sys.stderr)
    ready=db.execute("SELECT count(*) FROM sentences WHERE status='ready'").fetchone()[0]; review=db.execute("SELECT count(*) FROM sentences WHERE status='review'").fetchone()[0]
    print(f"\n{'═'*72}\nCOMPLETE: {ready} ready, {review} need review.\nLibrary: {root/a.db}", flush=True)
    return
    for im in images:
        try: process(db,im,a.model,raw_dir,cleaned_dir,analyzed_dir,a.reprocess)
        except Exception as e: print(f"ERROR  {im.name}: {e}",file=sys.stderr)
    print(f"\nLibrary: {root/a.db}")
    print("See ready sentences: sqlite3 language_library.sqlite \"SELECT russian, english FROM sentences WHERE status='ready';\"")
if __name__=="__main__": main()
