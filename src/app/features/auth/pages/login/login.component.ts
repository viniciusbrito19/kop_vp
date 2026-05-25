import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .login-bg {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      padding: 24px;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-xl);
      box-shadow: var(--shadow-lg);
      padding: 40px 36px 36px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-family: 'Instrument Serif', Georgia, serif;
      font-size: 22px;
      line-height: 1.1;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    .brand-tag {
      font-size: 11px;
      color: var(--text-4);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 600;
    }

    h2 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 6px;
      letter-spacing: -0.01em;
    }

    .subtitle {
      font-size: 13px;
      color: var(--text-3);
      margin: 0 0 28px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 24px;
    }

    label.input {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    label.input > span {
      font-size: 12px;
      color: var(--text-3);
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    label.input > input {
      font-family: inherit;
      font-size: 14px;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-sm);
      padding: 12px 14px;
      outline: none;
      transition: all 0.15s ease;
    }

    label.input > input:focus {
      border-color: var(--bordo);
      box-shadow: 0 0 0 3px var(--bordo-tint);
    }

    .btn-login {
      width: 100%;
      height: 44px;
      background: var(--bordo);
      color: #fff;
      border: 1px solid var(--bordo-2);
      border-radius: 999px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s ease;
      box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.10);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-login:hover:not(:disabled) {
      background: var(--bordo-2);
    }

    .btn-login:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: var(--bad-soft);
      color: var(--bad);
      border-radius: var(--r-sm);
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 16px;
    }
  `],
  template: `
    <div class="login-bg">
      <div class="login-card">

        <div class="brand">
          <img src="kop-icon.svg" width="48" height="48" alt="Kop VP" style="border-radius:13px;display:block"/>
          <div class="brand-text">
            <span class="brand-name">Kop VP</span>
            <span class="brand-tag">Chocolataria</span>
          </div>
        </div>

        <h2>Entrar</h2>
        <p class="subtitle">Acesso restrito à equipe de gestão.</p>

        @if (erro()) {
          <div class="error-msg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ erro() }}
          </div>
        }

        <form (ngSubmit)="entrar()" #form="ngForm">
          <div class="form-group">
            <label class="input">
              <span>E-mail</span>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                placeholder="seu@email.com"
                required
                autocomplete="email"
              />
            </label>

            <label class="input">
              <span>Senha</span>
              <input
                type="password"
                [(ngModel)]="senha"
                name="senha"
                placeholder="••••••••"
                required
                autocomplete="current-password"
              />
            </label>
          </div>

          <button type="submit" class="btn-login" [disabled]="carregando()">
            @if (carregando()) {
              <span class="spinner"></span>
              Entrando…
            } @else {
              Entrar
            }
          </button>
        </form>

      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  senha = '';
  carregando = signal(false);
  erro = signal('');

  async entrar(): Promise<void> {
    this.erro.set('');
    this.carregando.set(true);
    try {
      await this.auth.login(this.email, this.senha);
      this.router.navigate(['/']);
    } catch {
      this.erro.set('E-mail ou senha incorretos.');
    } finally {
      this.carregando.set(false);
    }
  }
}
