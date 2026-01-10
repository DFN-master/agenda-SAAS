import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

print('\n📊 STATUS AUTO-RESPOND DOS USUÁRIOS:\n')
print('='*80)

cur.execute('''
    SELECT id, name, email, ai_auto_respond_enabled, 
           ai_confidence_score, ai_total_approvals 
    FROM users 
    ORDER BY created_at DESC 
    LIMIT 10
''')

users = cur.fetchall()

if not users:
    print('❌ Nenhum usuário encontrado!')
else:
    for user in users:
        user_id, name, email, auto_enabled, confidence, approvals = user
        status = '✅ ATIVADO' if auto_enabled else '❌ DESATIVADO'
        print(f'\n👤 {name} ({email})')
        print(f'   ID: {user_id}')
        print(f'   Auto-Respond: {status}')
        print(f'   Confiança: {confidence or 0:.2f}')
        print(f'   Total Approvals: {approvals or 0}')

print('\n' + '='*80)
print('\n📱 CONEXÕES WHATSAPP ATIVAS:\n')

cur.execute('''
    SELECT id, company_id, connection_id, status 
    FROM user_connections 
    WHERE status = 'active' 
    ORDER BY created_at DESC 
    LIMIT 5
''')

connections = cur.fetchall()

if not connections:
    print('   ⚠️  NENHUMA CONEXÃO WHATSAPP ATIVA!')
    print('   → Escaneie o QR Code primeiro')
else:
    for conn_row in connections:
        conn_id, company_id, connection_id, status = conn_row
        print(f'   ✅ Connection {connection_id} (Company: {company_id})')

print('\n' + '='*80)
print('\n💡 COMO ATIVAR AUTO-RESPOND:\n')
print('1. Via API:')
print('   POST http://localhost:3000/api/ai/auto-respond/enable')
print('   Headers: Authorization: Bearer <seu-token>')
print('   Body: {"company_id": "uuid-da-empresa"}\n')
print('2. Via SQL direto:')
print('   UPDATE users SET ai_auto_respond_enabled = true WHERE id = \'seu-user-id\';\n')

conn.close()
