#!/usr/bin/env python3
"""
Teste Rápido - Sistema de Envio WhatsApp
Demonstra os endpoints sem necessidade de token (para teste de estrutura)
"""
import requests
import json

BASE_URL = "http://localhost:3000"
WHATSAPP_URL = "http://localhost:4000"

def print_section(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def check_services():
    """Verifica se os serviços estão online"""
    print_section("VERIFICAÇÃO DE SERVIÇOS")
    
    services = [
        ("Backend API", f"{BASE_URL}/health"),
        ("WhatsApp Service", f"{WHATSAPP_URL}/health"),
        ("Cognitive Engine", "http://localhost:5001/health"),
    ]
    
    all_ok = True
    for name, url in services:
        try:
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {name:<20} - ONLINE")
                print(f"   URL: {url}")
                print(f"   Response: {json.dumps(data, indent=2)}")
            else:
                print(f"❌ {name:<20} - ERROR (status {response.status_code})")
                all_ok = False
        except Exception as e:
            print(f"❌ {name:<20} - OFFLINE")
            print(f"   Error: {e}")
            all_ok = False
        print()
    
    return all_ok

def show_endpoint_info():
    """Mostra informações sobre os endpoints disponíveis"""
    print_section("ENDPOINTS DISPONÍVEIS")
    
    endpoints = [
        {
            "name": "Enviar Mensagem Simples",
            "method": "POST",
            "url": "/api/whatsapp/send",
            "body": {
                "company_id": "UUID_DA_EMPRESA",
                "phone": "(11) 98765-4321",
                "message": "Olá! Mensagem de teste."
            }
        },
        {
            "name": "Enviar Lembrete",
            "method": "POST",
            "url": "/api/whatsapp/send-reminder",
            "body": {
                "company_id": "UUID_DA_EMPRESA",
                "phone": "(11) 98765-4321",
                "clientName": "João Silva",
                "date": "15/01/2026",
                "time": "14:30",
                "service": "Consulta"
            }
        },
        {
            "name": "Enviar Confirmação",
            "method": "POST",
            "url": "/api/whatsapp/send-confirmation",
            "body": {
                "company_id": "UUID_DA_EMPRESA",
                "phone": "(11) 98765-4321",
                "clientName": "Maria Santos",
                "date": "20/01/2026",
                "time": "10:00",
                "confirmationCode": "AG2026-001"
            }
        },
        {
            "name": "Enviar Cancelamento",
            "method": "POST",
            "url": "/api/whatsapp/send-cancellation",
            "body": {
                "company_id": "UUID_DA_EMPRESA",
                "phone": "(11) 98765-4321",
                "clientName": "Pedro Costa",
                "date": "18/01/2026",
                "time": "16:00",
                "reason": "Teste de sistema"
            }
        }
    ]
    
    for i, endpoint in enumerate(endpoints, 1):
        print(f"📌 {i}. {endpoint['name']}")
        print(f"   {endpoint['method']} {BASE_URL}{endpoint['url']}")
        print(f"   Headers: Authorization: Bearer <TOKEN>")
        print(f"   Body:")
        print(f"   {json.dumps(endpoint['body'], indent=6)}")
        print()
    
    print("💡 Para usar estes endpoints, você precisa:")
    print("   1. Obter um token JWT (fazer login)")
    print("   2. Ter uma conexão WhatsApp ativa")
    print("   3. Ter um company_id válido")

def show_curl_examples():
    """Mostra exemplos de cURL para testar"""
    print_section("EXEMPLOS DE TESTE COM cURL")
    
    print("1️⃣ Obter Token (Login):")
    print('''
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"seu@email.com","password":"senha"}'
''')
    
    print("\n2️⃣ Enviar Mensagem Simples:")
    print('''
curl -X POST http://localhost:3000/api/whatsapp/send \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "company_id": "UUID_DA_EMPRESA",
    "phone": "11987654321",
    "message": "Teste de mensagem!"
  }'
''')
    
    print("\n3️⃣ Enviar Lembrete de Agendamento:")
    print('''
curl -X POST http://localhost:3000/api/whatsapp/send-reminder \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "company_id": "UUID_DA_EMPRESA",
    "phone": "11987654321",
    "clientName": "João Silva",
    "date": "15/01/2026",
    "time": "14:30",
    "service": "Consulta de Teste"
  }'
''')

def show_db_queries():
    """Mostra queries úteis para verificar o banco"""
    print_section("QUERIES ÚTEIS PARA VERIFICAÇÃO")
    
    print("🗄️ Verificar usuários cadastrados:")
    print("   SELECT id, email, name FROM users LIMIT 5;")
    print()
    
    print("🏢 Verificar empresas:")
    print("   SELECT id, name FROM companies LIMIT 5;")
    print()
    
    print("📞 Verificar conexões WhatsApp ativas:")
    print("   SELECT id, connection_id, status, created_at")
    print("   FROM user_connections")
    print("   WHERE status = 'active';")
    print()
    
    print("👥 Verificar relação usuário-empresa:")
    print("   SELECT user_id, company_id FROM company_users LIMIT 5;")

def main():
    print_section("TESTE DO SISTEMA DE ENVIO WHATSAPP")
    print("Este script verifica a estrutura e mostra como usar o sistema.")
    
    # Verificar serviços
    services_ok = check_services()
    
    if services_ok:
        print("\n✅ Todos os serviços estão online!")
    else:
        print("\n⚠️  Alguns serviços não estão disponíveis.")
        print("   Verifique com: pm2 list")
    
    # Mostrar informações dos endpoints
    show_endpoint_info()
    
    # Mostrar exemplos de cURL
    show_curl_examples()
    
    # Mostrar queries úteis
    show_db_queries()
    
    print_section("PRÓXIMOS PASSOS PARA TESTAR")
    print("1. Faça login para obter um token JWT")
    print("2. Verifique seu company_id no banco de dados")
    print("3. Certifique-se de ter uma conexão WhatsApp ativa")
    print("4. Use os comandos cURL acima substituindo:")
    print("   - SEU_TOKEN_AQUI → token obtido no login")
    print("   - UUID_DA_EMPRESA → seu company_id")
    print("   - 11987654321 → número de WhatsApp para teste")
    print()
    print("📚 Documentação completa: WHATSAPP_SEND_GUIDE.md")
    print("📝 Resumo executivo: WHATSAPP_SEND_SUMMARY.md")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Teste cancelado.")
    except Exception as e:
        print(f"\n\n❌ Erro: {e}")
