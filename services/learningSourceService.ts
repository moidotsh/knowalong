// services/learningSourceService.ts
// Composes learningSourceRepository; converts RepositoryResult to thrown
// AppError via throwIfFailed so React Query and the UI error boundary can
// react uniformly. The UI never calls repositories directly (S9/D5).

import type {
  LearningSource,
  CreateLyricDraftDTO,
  UpdateLearningSourceDTO,
} from '../shared/types/knowalong';
import { learningSourceRepository, throwIfFailed } from '../utils/supabase/repositories';

export const learningSourceService = {
  async listSources(userId: string): Promise<LearningSource[]> {
    const result = await learningSourceRepository.findAll(userId);
    return throwIfFailed(result, 'listSources');
  },

  async getSource(id: string, userId: string): Promise<LearningSource | null> {
    const result = await learningSourceRepository.findById(id, userId);
    return throwIfFailed(result, 'getSource');
  },

  async createDraft(userId: string, input: CreateLyricDraftDTO): Promise<LearningSource> {
    const result = await learningSourceRepository.createDraft(userId, input);
    return throwIfFailed(result, 'createDraft');
  },

  async updateSource(id: string, userId: string, input: UpdateLearningSourceDTO): Promise<LearningSource> {
    const result = await learningSourceRepository.update(id, userId, input);
    return throwIfFailed(result, 'updateSource');
  },

  async archiveSource(id: string, userId: string): Promise<LearningSource> {
    const result = await learningSourceRepository.archive(id, userId);
    return throwIfFailed(result, 'archiveSource');
  },
};
