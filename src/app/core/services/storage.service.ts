import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

const BUCKET = 'notas-fiscais';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private supabase = inject(SupabaseService).client;

  async uploadPdf(file: File, path: string): Promise<string> {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
}
