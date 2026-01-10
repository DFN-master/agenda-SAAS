#!/usr/bin/env python3
"""
Script de Teste - Sistema de Envio de Mensagens WhatsApp
Demonstra todas as funcionalidades de envio implementadas.
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000/api/whatsapp"

# CONFIGURAÇÃO - ALTERE ESTES VALORES
TOKEN = "seu-token-jwt-aqui"  # Obtenha fazendo login no sistema
COMPANY_ID = "123e4567-e89b-12d3-a456-426614174000"  # UUID da sua empresa
TEST_PHONE = "11987654321"  # Número de teste (SEU WhatsApp para receber)

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}

def print_section(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def print_result(response, test_name):
    print(f"📱 Teste: {test_name}")
    print(f"   Status: {response.status_code}")
    
    try:
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200:
            print(f"   ✅ SUCESSO")
        else:
            print(f"   ❌ ERRO")
    except:
        print(f"   Response: {response.text}")
        print(f"   ❌ ERRO")
    
    print()

def test_simple_message():
    """Teste 1: Enviar mensagem simples"""
    print_section("TESTE 1: Mensagem Simples")
    
    payload = {
        "company_id": COMPANY_ID,
        "phone": TEST_PHONE,
        "message": "🚀 Teste de mensagem simples do sistema Agenda-Sys!\n\nSe você recebeu esta mensagem, o sistema de envio está funcionando perfeitamente! ✅"
    }
    
    response = requests.post(f"{BASE_URL}/send", json=payload, headers=HEADERS)
    print_result(response, "Mensagem Simples")

def test_appointment_reminder():
    """Teste 2: Enviar lembrete de agendamento"""
    print_section("TESTE 2: Lembrete de Agendamento")
    
    # Data de amanhã
    tomorrow = datetime.now() + timedelta(days=1)
    date_str = tomorrow.strftime("%d/%m/%Y")
    
    payload = {
        "company_id": COMPANY_ID,
        "phone": TEST_PHONE,
        "clientName": "Teste Sistema",
        "date": date_str,
        "time": "14:30",
        "service": "Consulta de Teste",
        "location": "Clínica Teste - Sala 101"
    }
    
    response = requests.post(f"{BASE_URL}/send-reminder", json=payload, headers=HEADERS)
    print_result(response, "Lembrete de Agendamento")

def test_appointment_confirmation():
    """Teste 3: Enviar confirmação de agendamento"""
    print_section("TESTE 3: Confirmação de Agendamento")
    
    # Data de daqui a 3 dias
    future_date = datetime.now() + timedelta(days=3)
    date_str = future_date.strftime("%d/%m/%Y")
    
    payload = {
        "company_id": COMPANY_ID,
        "phone": TEST_PHONE,
        "clientName": "Teste Sistema",
        "date": date_str,
        "time": "10:00",
        "service": "Procedimento de Teste",
        "confirmationCode": f"TEST-{datetime.now().strftime('%Y%m%d%H%M')}"
    }
    
    response = requests.post(f"{BASE_URL}/send-confirmation", json=payload, headers=HEADERS)
    print_result(response, "Confirmação de Agendamento")

def test_appointment_cancellation():
    """Teste 4: Enviar notificação de cancelamento"""
    print_section("TESTE 4: Notificação de Cancelamento")
    
    payload = {
        "company_id": COMPANY_ID,
        "phone": TEST_PHONE,
        "clientName": "Teste Sistema",
        "date": "15/01/2026",
        "time": "16:00",
        "reason": "Teste de sistema - Simulação de cancelamento"
    }
    
    response = requests.post(f"{BASE_URL}/send-cancellation", json=payload, headers=HEADERS)
    print_result(response, "Notificação de Cancelamento")

def check_prerequisites():
    """Verifica se os pré-requisitos estão atendidos"""
    print_section("VERIFICAÇÃO DE PRÉ-REQUISITOS")
    
    # 1. Verificar se backend está online
    try:
        response = requests.get("http://localhost:3000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend online (porta 3000)")
        else:
            print("❌ Backend respondeu mas com erro")
            return False
    except:
        print("❌ Backend não está acessível (porta 3000)")
        print("   Execute: pm2 restart agenda-backend")
        return False
    
    # 2. Verificar se WhatsApp service está online
    try:
        response = requests.get("http://localhost:4000/health", timeout=5)
        if response.status_code == 200:
            print("✅ WhatsApp Service online (porta 4000)")
        else:
            print("❌ WhatsApp Service respondeu mas com erro")
            return False
    except:
        print("❌ WhatsApp Service não está acessível (porta 4000)")
        print("   Execute: pm2 restart whatsapp-service")
        return False
    
    # 3. Verificar configuração
    if TOKEN == "seu-token-jwt-aqui":
        print("⚠️  TOKEN não configurado")
        print("   Edite este arquivo e coloque seu token JWT")
        return False
    else:
        print("✅ Token configurado")
    
    if COMPANY_ID == "123e4567-e89b-12d3-a456-426614174000":
        print("⚠️  COMPANY_ID padrão (pode não existir)")
        print("   Edite este arquivo com um company_id válido do seu banco")
    else:
        print("✅ Company ID configurado")
    
    if TEST_PHONE == "11987654321":
        print("⚠️  TEST_PHONE padrão")
        print("   Edite este arquivo com seu número de WhatsApp")
        return False
    else:
        print(f"✅ Número de teste configurado: {TEST_PHONE}")
    
    print("\n✅ Todos os pré-requisitos atendidos!")
    return True

def main():
    print_section("SISTEMA DE ENVIO DE MENSAGENS WHATSAPP - TESTE COMPLETO")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Base URL: {BASE_URL}")
    print(f"Telefone de Teste: {TEST_PHONE}")
    
    if not check_prerequisites():
        print("\n❌ Pré-requisitos não atendidos. Corrija os problemas acima.")
        return
    
    print("\n" + "="*80)
    print("  INICIANDO TESTES")
    print("="*80)
    
    input("\n⚠️  Os testes enviarão mensagens reais para o WhatsApp.\nPressione ENTER para continuar ou CTRL+C para cancelar...")
    
    # Executar testes
    test_simple_message()
    
    input("\n⏸️  Pressione ENTER para continuar com o próximo teste...")
    test_appointment_reminder()
    
    input("\n⏸️  Pressione ENTER para continuar com o próximo teste...")
    test_appointment_confirmation()
    
    input("\n⏸️  Pressione ENTER para continuar com o próximo teste...")
    test_appointment_cancellation()
    
    print_section("TESTES CONCLUÍDOS")
    print("✅ Todos os testes foram executados!")
    print("\n📱 Verifique seu WhatsApp para confirmar o recebimento das mensagens.")
    print("\nSe algum teste falhou:")
    print("  1. Verifique se o WhatsApp está conectado (QR code escaneado)")
    print("  2. Verifique os logs: pm2 logs agenda-backend")
    print("  3. Verifique os logs: pm2 logs whatsapp-service")
    print("  4. Confirme que existe uma conexão ativa no banco: SELECT * FROM user_connections;")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Testes cancelados pelo usuário.")
    except Exception as e:
        print(f"\n\n❌ Erro durante os testes: {e}")
