import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private db = inject(SupabaseService).client;
  private router = inject(Router);

  async login(email: string, password: string): Promise<void> {
    const { error } = await this.db.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async logout(): Promise<void> {
    const { error } = await this.db.auth.signOut();
    if (error) throw error;
    this.router.navigate(['/login']);
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.db.auth.getSession();
    return data.session;
  }

  async getUser(): Promise<User | null> {
    const { data } = await this.db.auth.getUser();
    return data.user;
  }
}
