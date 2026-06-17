import { createHmac } from 'node:crypto';
import { computeSignature, verifySignature } from '@/common/crypto/signature.util';

describe('signature.util', () => {
  const secret = 'super-secret-app-secret-trocar';
  const body = JSON.stringify({ hello: 'world', n: 42 });
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

  it('gera a assinatura no formato da Meta (sha256=<hmac>)', () => {
    expect(computeSignature(body, secret)).toBe(expected);
  });

  it('valida uma assinatura correta', () => {
    expect(verifySignature(body, secret, expected)).toBe(true);
  });

  it('rejeita assinatura incorreta', () => {
    expect(verifySignature(body, secret, 'sha256=deadbeef')).toBe(false);
  });

  it('rejeita header ausente ou sem o prefixo sha256=', () => {
    expect(verifySignature(body, secret, undefined)).toBe(false);
    expect(verifySignature(body, secret, 'semprefixo')).toBe(false);
  });

  it('rejeita quando o corpo foi adulterado', () => {
    expect(verifySignature(`${body} `, secret, expected)).toBe(false);
  });
});
