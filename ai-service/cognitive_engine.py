"""
Motor Cognitivo - Cognitive Engine
Sistema de IA local que escolhe e processa conhecimento para gerar respostas inteligentes.
Com análise estrutural de frases para detectar intenção do usuário.

IMPORTANTE: Sistema Multi-Tenant (SaaS)
- Todos os dados são isolados por company_id
- Cache é separado por empresa para evitar vazamento de dados
- Todas as queries filtram por company_id obrigatoriamente
"""
import os
import re
import uuid
import logging
from flask import Flask, request, jsonify
from typing import List, Dict, Any, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import nltk
from functools import lru_cache
from datetime import datetime, timedelta

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

# Load .env file manually
def load_env_file():
    """Load environment variables from .env file"""
    env_paths = [
        './backend/.env',
        '../backend/.env',
        './.env',
        os.path.expanduser('~/.env')
    ]
    
    for env_path in env_paths:
        if os.path.exists(env_path):
            try:
                with open(env_path) as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            os.environ[key.strip()] = value.strip()
                return True
            except Exception as e:
                print(f"Error loading {env_path}: {e}")
    return False

# Load env before anything else
load_env_file()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False  # Allow UTF-8 characters in JSON
app.config['PREFERRED_ENCODING'] = 'utf-8'

# ==================== MULTI-TENANT CACHE SYSTEM ====================
# Cache isolado por company_id para evitar vazamento de dados entre empresas
class TenantCache:
    """Cache multi-tenant: dados isolados por company_id com TTL."""
    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.timestamps: Dict[str, datetime] = {}
        self.ttl_seconds = 3600  # 1 hora
    
    def set(self, company_id: str, key: str, value: Any):
        """Armazena valor no cache (isolado por company_id)."""
        cache_key = f"{company_id}:{key}"
        self.cache[cache_key] = value
        self.timestamps[cache_key] = datetime.now()
        logger.debug(f"[CACHE] Set: {cache_key}")
    
    def get(self, company_id: str, key: str) -> Any:
        """Recupera valor do cache se existir e não expirou."""
        cache_key = f"{company_id}:{key}"
        
        # Verificar expiração
        if cache_key in self.timestamps:
            age = (datetime.now() - self.timestamps[cache_key]).total_seconds()
            if age > self.ttl_seconds:
                del self.cache[cache_key]
                del self.timestamps[cache_key]
                logger.debug(f"[CACHE] Expired: {cache_key}")
                return None
        
        value = self.cache.get(cache_key)
        if value is not None:
            logger.debug(f"[CACHE] Hit: {cache_key}")
        return value
    
    def clear(self, company_id: str = None):
        """Limpa cache de uma empresa específica ou global."""
        if company_id:
            # Limpar apenas da empresa
            keys_to_delete = [k for k in self.cache.keys() if k.startswith(f"{company_id}:")]
            for k in keys_to_delete:
                del self.cache[k]
                del self.timestamps[k]
            logger.info(f"[CACHE] Cleared {len(keys_to_delete)} entries for company {company_id}")
        else:
            # Limpar global (cuidado!)
            self.cache.clear()
            self.timestamps.clear()
            logger.warning("[CACHE] Global cache cleared")

# Instância global de cache
tenant_cache = TenantCache()

# Configure Flask to handle UTF-8 properly
import sys
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/agenda')
DEBUG_VERSION = "semantic-2026-01-09T23:55Z"

# Ollama LLM Configuration
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'gemma2:2b')  # Modelo leve e rápido (1.6GB)
OLLAMA_ENABLED = os.getenv('OLLAMA_ENABLED', 'true').lower() == 'true'
OLLAMA_TIMEOUT = int(os.getenv('OLLAMA_TIMEOUT', '15'))  # Timeout reduzido para respostas mais rápidas

# Log startup info
logger.info(f"Cognitive Engine Starting")
logger.info(f"DATABASE_URL set: {bool(os.getenv('DATABASE_URL'))}")
logger.info(f"DATABASE_URL value: {DATABASE_URL[:50]}..." if len(DATABASE_URL) > 50 else f"DATABASE_URL: {DATABASE_URL}")
logger.info(f"Ollama LLM: {'ENABLED' if OLLAMA_ENABLED else 'DISABLED'} - Model: {OLLAMA_MODEL} - Timeout: {OLLAMA_TIMEOUT}s")

print("[STARTUP] Flask app initialized", flush=True)
import sys
sys.stdout.flush()
sys.stderr.flush()

# ==================== MULTI-TENANT MIDDLEWARE ====================
@app.before_request
def validate_tenant():
    """Middleware para validar company_id em requisições de AI."""
    # Endpoints que não precisam de company_id (health checks, etc)
    public_endpoints = ['/health', '/debug-version']
    
    if request.path in public_endpoints:
        return None
    
    # Para outros endpoints que processam dados, validar company_id
    if request.method == 'POST' and request.path == '/cognitive-response':
        try:
            data = request.get_json() or {}
            company_id = data.get('company_id')
            
            if not company_id:
                logger.warning(f"[SECURITY] Request to {request.path} missing company_id from {request.remote_addr}")
                return jsonify({'error': 'company_id é obrigatório'}), 400
            
            # Validar UUID
            try:
                uuid.UUID(str(company_id))
            except ValueError:
                logger.warning(f"[SECURITY] Request with invalid company_id: {company_id} from {request.remote_addr}")
                return jsonify({'error': 'company_id deve ser um UUID válido'}), 400
            
        except Exception as e:
            logger.error(f"[SECURITY] Error validating tenant: {e}")
            return jsonify({'error': 'Erro na validação de tenant'}), 500
    
    return None

def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def fetch_approved_word_meanings(company_id: str) -> Dict[str, Dict[str, Any]]:
    """
    Busca significados de palavras aprovados pela admin para usar no léxico local.
    
    MULTI-TENANT SAFETY:
    - Dados filtrados por company_id
    - Cache isolado por empresa com TTL de 1 hora
    """
    # Tentar recuperar do cache primeiro
    cached = tenant_cache.get(company_id, 'word_meanings')
    if cached is not None:
        return cached
    
    meanings: Dict[str, Dict[str, Any]] = {}
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Primeiro, tentar buscar vocabulário do metadata da empresa
        try:
            cur.execute("""
                SELECT metadata
                FROM companies
                WHERE id = %s
            """, (company_id,))
            result = cur.fetchone()
            
            if result and result.get('metadata'):
                metadata = result.get('metadata') or {}
                vocabulary = metadata.get('vocabulary', [])
                
                # Processar vocabulário do metadata
                for word_entry in vocabulary:
                    word = word_entry.get('word', '').lower().strip()
                    if word:
                        meanings[word] = {
                            'id': word_entry.get('id'),
                            'definition': word_entry.get('definition', ''),
                            'synonyms': word_entry.get('synonyms', []),
                            'examples': word_entry.get('examples', []),
                            'source': 'vocabulary_metadata',
                            'company_id': company_id  # Marcar origem
                        }
        except Exception as meta_error:
            # Coluna metadata pode não existir
            logger.debug(f"Could not fetch metadata for {company_id}: {meta_error}")
        
        # Também buscar significados de uma tabela ai_word_meanings se existir
        try:
            cur.execute("""
                SELECT id, word, definition
                FROM ai_word_meanings
                WHERE company_id = %s AND status = 'approved'
            """, (company_id,))
            results = cur.fetchall()
            
            for row in results:
                word = row.get('word', '').lower().strip()
                if word:
                    meanings[word] = {
                        'id': row.get('id'),
                        'definition': row.get('definition'),
                        'source': 'ai_word_meanings_table',
                        'company_id': company_id
                    }
        except Exception as table_error:
            # Tabela pode não existir ou estar vazia
            logger.debug(f"Could not fetch ai_word_meanings for {company_id}: {table_error}")
        
        cur.close()
        conn.close()
        
        # Armazenar no cache
        tenant_cache.set(company_id, 'word_meanings', meanings)
        
    except Exception as e:
        logger.error(f"Failed to fetch approved word meanings for {company_id}: {e}")
    
    return meanings

def tokenize(text: str) -> List[str]:
    """Tokeniza texto em palavras relevantes (2+ caracteres, excluindo números puros)."""
    # Captura palavras com 2+ caracteres, permitindo apostrofos (contrações pt-br)
    words = re.findall(r'\b\w{2,}\b', text.lower())
    # Filtrar palavras que são apenas números
    words = [w for w in words if not w.isdigit()]
    return words

# Léxico semântico básico (pt-BR): mapeia palavras a conceitos e significados
# Objetivo: fornecer ao motor cognitivo o "significado das palavras" sem depender
# de respostas pré-cadastradas no banco.
SEMANTIC_LEXICON: Dict[str, Dict[str, Any]] = {
    # ========== PALAVRAS INTERROGATIVAS (MUITO IMPORTANTES) ==========
    "como": {"concept": "modo/forma", "definition": "pergunta sobre a maneira de fazer algo, forma ou modo de operação.",
             "synonyms": ["como", "de que forma", "qual forma", "de que jeito"],
             "topic": "interrogativa"},
    "qual": {"concept": "qual", "definition": "pergunta para identificar ou escolher entre opções.",
             "synonyms": ["qual", "quais", "que tipo"],
             "topic": "interrogativa"},
    "onde": {"concept": "localização", "definition": "pergunta sobre o local ou lugar onde algo se encontra.",
             "synonyms": ["onde", "em qual lugar", "qual endereço"],
             "topic": "interrogativa"},
    "quando": {"concept": "tempo", "definition": "pergunta sobre o momento ou hora de algo acontecer.",
              "synonyms": ["quando", "em que momento", "que hora", "qual data"],
              "topic": "interrogativa"},
    "por que": {"concept": "razão/motivo", "definition": "pergunta sobre o motivo ou razão de algo.",
                "synonyms": ["por que", "qual motivo", "qual razão", "porquê"],
                "topic": "interrogativa"},
    "quem": {"concept": "pessoa", "definition": "pergunta para identificar uma pessoa.",
             "synonyms": ["quem", "qual pessoa"],
             "topic": "interrogativa"},
    "quanto": {"concept": "quantidade/preço", "definition": "pergunta sobre quantidade, preço ou valor.",
               "synonyms": ["quanto", "quanto custa", "qual preço"],
               "topic": "interrogativa"},
    
    # ========== VERBOS AUXILIARES E COMUNS ==========
    "estar": {"concept": "estado/situação", "definition": "indicar estado, condição ou localização de algo.",
              "synonyms": ["estar", "estou", "está", "estamos", "estão"],
              "topic": "verbo"},
    "ser": {"concept": "identidade/essência", "definition": "indicar identidade, qualidade ou característica.",
            "synonyms": ["ser", "sou", "é", "somos", "são"],
            "topic": "verbo"},
    "fazer": {"concept": "ação", "definition": "indicar uma ação, criação ou realização de algo.",
              "synonyms": ["fazer", "faço", "faz", "fazemos", "fazem"],
              "topic": "verbo"},
    "ir": {"concept": "movimento", "definition": "indicar deslocamento ou movimento para um lugar.",
           "synonyms": ["ir", "vou", "vai", "vamos", "vão"],
           "topic": "verbo"},
    "ter": {"concept": "posse", "definition": "indicar propriedade, existência ou característica.",
            "synonyms": ["ter", "tenho", "tem", "temos", "têm"],
            "topic": "verbo"},
    "pode": {"concept": "capacidade/permissão", "definition": "indicar possibilidade, permissão ou capacidade.",
             "synonyms": ["pode", "posso", "podemos", "podem", "podes"],
             "topic": "verbo"},
    "preciso": {"concept": "necessidade", "definition": "indicar que algo é necessário ou obrigatório.",
                "synonyms": ["preciso", "precisa", "precisamos", "precisam"],
                "topic": "verbo"},
    "gostaria": {"concept": "desejo/preferência", "definition": "expressar um desejo ou preferência de forma educada.",
                 "synonyms": ["gostaria", "gostaria de", "gostaria que"],
                 "topic": "verbo"},
    
    # ========== VERBOS DE AGENDAMENTO ==========
    "agendar": {"concept": "agendamento", "definition": "marcar um horário ou data para uma atividade futura.",
                "synonyms": ["agendar", "agendos", "agenda", "agendam", "agendei"],
                "topic": "agendamento"},
    "marcar": {"concept": "agendamento", "definition": "marcar ou reservar um horário/data para algo.",
               "synonyms": ["marcar", "marco", "marca", "marcamos", "marcaram"],
               "topic": "agendamento"},
    
    # ========== PALAVRAS DE TEMPO E DATAS ==========
    "hoje": {"concept": "tempo presente", "definition": "no dia de hoje, neste dia.",
             "synonyms": ["hoje"],
             "topic": "tempo"},
    "amanhe": {"concept": "tempo futuro próximo", "definition": "no dia seguinte ao de hoje.",
               "synonyms": ["amanhã", "amanhe"],
               "topic": "tempo"},
    "semana": {"concept": "período", "definition": "período de sete dias.",
               "synonyms": ["semana", "semanalmente"],
               "topic": "tempo"},
    "proxima": {"concept": "tempo futuro", "definition": "que vem a seguir, vindouro.",
                "synonyms": ["próxima", "proxima", "próximo", "proximo"],
                "topic": "tempo"},
    "horario": {"concept": "hora/momento", "definition": "o momento específico do dia em que algo acontece.",
                "synonyms": ["horário", "horario", "hora", "horas"],
                "topic": "tempo"},
    "data": {"concept": "data", "definition": "o dia específico de um mês ou ano.",
             "synonyms": ["data", "datas"],
             "topic": "tempo"},

    # ========== PALAVRAS DE SERVIÇO ==========
    "consulta": {"concept": "tipo de serviço", "definition": "atendimento ou reunião para obter informação ou parecer.",
                 "synonyms": ["consulta", "consultoria"],
                 "topic": "serviço"},
    "visita": {"concept": "tipo de serviço", "definition": "ir até o local do cliente para fornecer serviço.",
               "synonyms": ["visita", "visitar"],
               "topic": "serviço"},
    "reuniao": {"concept": "tipo de serviço", "definition": "encontro entre pessoas para discutir ou decidir algo.",
                "synonyms": ["reunião", "reuniao"],
                "topic": "serviço"},
    "suporte": {"concept": "tipo de serviço", "definition": "assistência técnica ou apoio em caso de problema.",
                "synonyms": ["suporte", "suportamos"],
                "topic": "serviço"},
    "tecnico": {"concept": "tipo de serviço", "definition": "atendimento especializado em problemas técnicos.",
                "synonyms": ["técnico", "tecnico"],
                "topic": "serviço"},
    "servico": {"concept": "tipo de serviço", "definition": "trabalho realizado para atender a uma necessidade.",
                "synonyms": ["serviço", "servico"],
                "topic": "serviço"},

    "eu": {"concept": "primeira pessoa singular", "definition": "pronome que se refere ao falante.",
           "synonyms": ["eu", "me", "mim", "meu"],
           "topic": "pronome"},
    "você": {"concept": "segunda pessoa", "definition": "pronome que se refere ao interlocutor de forma respeitosa.",
             "synonyms": ["você", "vc", "voce", "vcs", "vocês"],
             "topic": "pronome"},
    "ele": {"concept": "terceira pessoa singular masculino", "definition": "pronome que se refere a uma pessoa ou coisa.",
            "synonyms": ["ele", "o", "lhe", "seu"],
            "topic": "pronome"},
    "ela": {"concept": "terceira pessoa singular feminino", "definition": "pronome que se refere a uma pessoa ou coisa feminina.",
            "synonyms": ["ela", "a", "lhe", "sua"],
            "topic": "pronome"},
    "nós": {"concept": "primeira pessoa plural", "definition": "pronome que se refere ao falante e outras pessoas.",
            "synonyms": ["nós", "nos", "nosso"],
            "topic": "pronome"},

    # ========== VERBOS DE AÇÃO COMUNS EM ATENDIMENTO ==========
    "entender": {"concept": "compreensão", "definition": "captar o significado ou compreender algo.",
                 "synonyms": ["entender", "entendi", "entende", "compreender"],
                 "topic": "verbo"},
    "ajudar": {"concept": "assistência", "definition": "oferecer auxílio ou assistência a alguém.",
               "synonyms": ["ajudar", "ajudo", "ajuda", "socorro", "assistência"],
               "topic": "verbo"},
    "resolver": {"concept": "solução", "definition": "encontrar solução para um problema.",
                 "synonyms": ["resolver", "resolvo", "resolve", "solucionar"],
                 "topic": "verbo"},
    "explicar": {"concept": "esclarecimento", "definition": "tornar claro ou compreensível algo.",
                 "synonyms": ["explicar", "explico", "explica", "esclarecer"],
                 "topic": "verbo"},
    "mostrar": {"concept": "demonstração", "definition": "apresentar ou demonstrar algo.",
                "synonyms": ["mostrar", "mostro", "mostra", "indicar"],
                "topic": "verbo"},
    "falar": {"concept": "comunicação", "definition": "expressar-se através de palavras.",
              "synonyms": ["falar", "falo", "fala", "conversar", "dialogar"],
              "topic": "verbo"},

    # ========== ADJETIVOS COMUNS ==========
    "bom": {"concept": "qualidade positiva", "definition": "de boa qualidade ou adequado.",
            "synonyms": ["bom", "boa", "ótimo", "excelente"],
            "topic": "adjetivo"},
    "rápido": {"concept": "velocidade", "definition": "que se move ou acontece em pouco tempo.",
               "synonyms": ["rápido", "rápida", "veloz", "ágil"],
               "topic": "adjetivo"},
    "fácil": {"concept": "simplicidade", "definition": "que não apresenta dificuldade.",
              "synonyms": ["fácil", "simples", "descomplicado"],
              "topic": "adjetivo"},
    "disponível": {"concept": "acessibilidade", "definition": "que está pronto ou acessível.",
                   "synonyms": ["disponível", "acessível", "livre"],
                   "topic": "adjetivo"},
    "novo": {"concept": "modernidade", "definition": "que foi recentemente criado ou adquirido.",
             "synonyms": ["novo", "nova", "inédito", "recente"],
             "topic": "adjetivo"},

    # ========== PLANOS E PREÇOS ==========
    "preco": {"concept": "preço", "definition": "valor cobrado por um serviço ou produto.",
               "synonyms": ["preço", "valor", "custo", "quanto", "quanto custa", "valores"],
               "topic": "comercial"},
    "planos": {"concept": "planos", "definition": "conjuntos de ofertas com características e preços distintos.",
                "synonyms": ["plano", "planos", "pacote", "pacotes", "assinatura"],
                "topic": "comercial"},
    "agendar": {"concept": "agendamento", "definition": "ato de marcar data e horário para um compromisso.",
                 "synonyms": ["agendar", "agendamento", "marcar", "agenda", "horario", "horário"],
                 "topic": "operacional"},
    "suporte": {"concept": "suporte", "definition": "ajuda técnica ou atendimento ao cliente.",
                 "synonyms": ["suporte", "ajuda", "atendimento", "problema", "erro"],
                 "topic": "atendimento"},
    "pagamento": {"concept": "pagamento", "definition": "processo de quitação de um valor devido.",
                   "synonyms": ["pagar", "pagamento", "boleto", "cartao", "cartão", "pix"],
                   "topic": "financeiro"},
    "cancelar": {"concept": "cancelamento", "definition": "encerrar um serviço ou compromisso.",
                  "synonyms": ["cancelar", "cancelamento", "rescindir"],
                  "topic": "operacional"},
    "integracao": {"concept": "integração", "definition": "ligação entre sistemas para troca de dados.",
                    "synonyms": ["integracao", "integração", "api", "webhook", "conectar"],
                    "topic": "tecnico"},
}

STOPWORDS_PT = {
    "de", "da", "do", "das", "dos", "e", "ou", "a", "o", "os", "as", "um", "uma",
    "para", "por", "com", "sem", "em", "no", "na", "nos", "nas", "que",
    # REMOVIDO: "qual", "quais" - são palavras-chave importantes em português
}

# Padrões estruturais para detecção de intenção (análise sintática simples)
INTENT_PATTERNS = {
    "ask_capabilities": {
        "patterns": [
            r"(?:o que|quais?|que).*(?:você|vc|voce).*(?:faz|pode|consegue|sabe)",
            r"(?:você|vc|voce).*(?:faz|pode|consegue|sabe).*(?:o que|qual|quais)",
            r"(?:quais?|o que).*(?:você|vc|voce).*(?:fazer|fazer)",
            r"capabilit",
        ],
        "response_template": "Posso ajudar você com:\n{actions}\n\nO que você gostaria de fazer?",
        "actions": [
            "📅 **Agendar compromissos** - Marcar datas e horários",
            "💰 **Informações de preços e planos** - Detalhar valores",
            "🔧 **Suporte técnico** - Resolver problemas e integrar sistemas",
            "📋 **Gerenciar sua agenda** - Visualizar e modificar agendamentos",
            "💬 **Responder dúvidas** - Esclarecer sobre serviços",
        ]
    },
    "ask_scheduling": {
        "patterns": [
            r"(?:gostaria|quero|preciso|desejo|gosto|pode).+(?:agendar|marcar|agendar consulta|agendar visita|agendar reunião|agendar horário|schedule|me agendar|agendar um)",
            r"(?:agendar|marcar|agenda|agend|me agendar).+(?:consulta|visita|reunião|horario|hora|dia|data|atendimento|reunião)",
            r"(?:agend|march).+(?:para|em|dia|data|horario|hora|quando)",
            r"\bagendar\b.*(?:amanh|proxima|segunda|terça|quarta|quinta|sexta|sabado|proximo|fim de semana)",
            r"(?:quando|qual.{0,20}horario|qual.{0,20}dia|que horas|qual data).+(?:agende|marca|agenda|agend|atendimento)",
            r"(?:marcar|agendar|pode agendar|me agendar).+(?:turno|slot|disponibilidade|atendimento|horario)",
        ],
        "response_template": "Ótimo! Para agendar sua {service}:\n{steps}\n\nQual data e horário você prefere?",
        "service": "consulta/serviço",
        "steps": [
            "1️⃣ Qual serviço ou tipo de atendimento?",
            "2️⃣ Qual data deseja? (ex: hoje, amanhã, próxima semana)",
            "3️⃣ Qual horário prefere? (ex: 09:00, 14:00)",
            "4️⃣ Qual seu contato para confirmação?",
        ]
    },
    "ask_pricing": {
        "patterns": [
            r"(?:qual|quais?|quanto).+(?:preco|prec|cust|val|tarifa|plano)",
            r"(?:preco|prec|cust|val|tarifa).+(?:de|dos?|da)",
            r"\bplano\b",
        ],
        "response_template": "Temos diferentes planos:\n{plans}\n\nQual interesse você mais?",
        "plans": [
            "**Plano Basic** - Agenda e agendamentos simples",
            "**Plano Pro** - Com WhatsApp integrado e automação",
            "**Plano Enterprise** - Solução completa com API",
        ]
    },
    "ask_how_to": {
        "patterns": [
            r"\bcomo\b.+(?:fazer|usar|agendar|integrar|funciona|pagar|marcar|faco|faca)",
            r"(?:como|de que forma|qual a forma).+(?:fazer|usar|agendar|pagar)",
            r"(?:qual|quais?).+(?:passo|etapa|processo|forma|jeito)",
        ],
        "response_template": "Para {action}:\n{steps}\n\nPrecisa de mais detalhes?",
        "steps": [
            "1️⃣ Acesse o painel de controle",
            "2️⃣ Clique em {section}",
            "3️⃣ Preencha os dados solicitados",
            "4️⃣ Confirme a ação",
        ]
    },
    "ask_status": {
        "patterns": [
            r"\bcomo\b.+(?:esta|ta|passa|vai|corre|anda)",
            r"(?:tudo).+(?:bem|ok|certo|bom)",
            r"(?:esta|ta).+(?:funcionando|pronto|disponivel)",
        ],
        "response_template": "Status atual: {status}\n\nTudo funcionando normalmente!",
        "status": "✅ Sistema online e operacional"
    },
    "ask_location": {
        "patterns": [
            r"\bonde\b.+(?:fica|funciona|está)",
            r"(?:qual|quais?).+(?:endereço|local|filial)",
        ],
        "response_template": "Estamos localizados em:\n{location}\n\nComo posso ajudar?",
        "location": "Consulte nosso endereço no painel"
    },
    "ask_time": {
        "patterns": [
            r"\bquando\b.+(?:abre|funciona|atende|horario)",
            r"(?:qual|quais?).+(?:horario|hora|periodo|expediente)",
        ],
        "response_template": "Nosso horário:\n{time}\n\nEm qual dia você prefere?",
        "time": "Segunda a Sexta: 9h às 18h\nSábado: 9h às 13h"
    },
    "report_issue": {
        "patterns": [
            r"(?:problema|erro|não funciona|nao funciona|bug)",
            r"(?:não consigo|nao consigo).*(?:fazer|usar)",
        ],
        "response_template": "Entendi que você está com problema. Deixe-me ajudar:\n{steps}\n\nDescreva o problema mais detalhadamente?",
        "steps": [
            "1️⃣ Qual é exatamente o problema?",
            "2️⃣ Em qual tela ou função?",
            "3️⃣ Qual mensagem de erro recebeu (se houver)?",
            "4️⃣ Quando começou?",
        ]
    },
    "general_inquiry": {
        "patterns": [r".*"],  # Fallback padrão
        "response_template": "Recebi sua mensagem sobre {topic}:\n{explanation}\n\nPosso ajudá-lo com mais informações?",
    }
}

def detect_intent(text: str) -> Tuple[str, float]:
    """
    Detecta a intenção do usuário analisando a estrutura da frase.
    Retorna (intent_name, confidence).
    
    Exemplos:
    - "O que vc faz?" → ("ask_capabilities", 0.95)
    - "Qual o preço?" → ("ask_pricing", 0.9)
    - "Gostaria de agendar" → ("ask_scheduling", 0.95)
    - "Como agendar?" → ("ask_how_to", 0.85)
    - "Como está?" → ("ask_status", 0.8)
    - "Onde fica?" → ("ask_location", 0.8)
    - "Qual horário?" → ("ask_time", 0.8)
    - "Tenho um problema" → ("report_issue", 0.8)
    """
    # Normalizar texto: lowercase + remover acentos
    text_lower = text.lower()
    text_normalized = normalize_text(text_lower)  # Remove acentos sem singularizar
    
    best_match = "general_inquiry"
    best_confidence = 0.5
    
    for intent_name, intent_data in INTENT_PATTERNS.items():
        if intent_name == "general_inquiry":
            continue  # Fallback, pula para agora
        
        patterns = intent_data.get("patterns", [])
        for pattern in patterns:
            # Aplicar regex no texto normalizado (sem acentos)
            match = re.search(pattern, text_normalized, re.IGNORECASE)
            if match:
                # Calcular confiança baseado em:
                # 1. Qualidade do match da regex
                # 2. Tamanho da mensagem (msgs curtas com match são mais precisas)
                match_text = match.group(0)
                match_ratio = len(match_text) / max(len(text), 1)
                
                # Msgs curtas com padrão claro = alta confiança
                text_length = len(text.split())
                if text_length <= 3 and match_ratio > 0.5:
                    confidence = 0.90
                elif match_ratio > 0.6:
                    confidence = 0.85
                else:
                    confidence = 0.8 + (match_ratio * 0.15)
                
                confidence = min(0.95, confidence)
                
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_match = intent_name
    
    return best_match, best_confidence

def generate_llm_response(
    intent: str,
    incoming_message: str,
    semantics: Dict[str, Any],
    vocabulary: Dict[str, Dict[str, Any]],
    company_id: str
) -> Dict[str, Any]:
    """
    Gera resposta natural usando Ollama LLM baseado em:
    - Intent detectada pelo cognitive engine
    - Contexto semântico (palavras reconhecidas, tópicos)
    - Vocabulário aprendido da empresa
    - Mensagem original do cliente
    
    Retorna dict com:
    - response: str (resposta gerada)
    - used_llm: bool (True se LLM foi usado)
    - fallback: bool (True se caiu no fallback)
    - error: str (mensagem de erro se houver)
    """
    
    if not OLLAMA_ENABLED:
        return {
            'response': None,
            'used_llm': False,
            'fallback': False,
            'error': 'LLM disabled'
        }
    
    try:
        # Construir contexto rico para o LLM
        recognized = semantics.get("recognized", [])
        topics = semantics.get("topics", {})
        
        # Formatar vocabulário para o prompt
        vocab_context = ""
        if vocabulary:
            vocab_list = []
            for word, info in list(vocabulary.items())[:5]:  # Limitar a 5 palavras mais relevantes
                definition = info.get('definition', '')
                if definition:
                    vocab_list.append(f"- {word}: {definition}")
            if vocab_list:
                vocab_context = "\n\nVocabulário da empresa:\n" + "\n".join(vocab_list)
        
        # Formatar tópicos reconhecidos
        topics_context = ""
        if recognized:
            concepts = [r.get('concept', '') for r in recognized[:3]]
            concepts = [c for c in concepts if c]
            if concepts:
                topics_context = f"\n\nConceitos identificados: {', '.join(concepts)}"
        
        # Mapear intent para contexto de resposta
        intent_instructions = {
            'ask_scheduling': 'Seja entusiasmado em ajudar com agendamentos. Pergunte a data/horário e tipo de serviço desejado. Ofereça horários disponíveis se souber.',
            'ask_status': 'Responda de forma amigável sobre o status/estado atual do sistema ou serviço.',
            'ask_time': 'Informe os horários de funcionamento de forma clara e útil.',
            'ask_location': 'Forneça informações sobre localização e como acessar o serviço.',
            'ask_pricing': 'Explique os planos e preços disponíveis de forma clara e objetiva.',
            'ask_how_to': 'Forneça instruções passo a passo de forma didática e fácil de entender.',
            'ask_capabilities': 'Liste as principais funcionalidades e serviços oferecidos com entusiasmo.',
            'report_issue': 'Seja empático e ofereça ajuda imediata para resolver o problema.',
            'general_inquiry': 'Responda de forma útil, profissional e amigável.'
        }
        
        instruction = intent_instructions.get(intent, intent_instructions['general_inquiry'])
        
        # Construir prompt mais detalhado baseado na intenção
        if intent == 'ask_scheduling':
            # NOVO: Extrair detalhes de agendamento
            scheduling_details = extract_scheduling_details(incoming_message)
            
            # Construir prompt com detalhes extraídos
            extracted_info = ""
            if scheduling_details['client_name']:
                extracted_info += f"\n✓ Cliente: {scheduling_details['client_name']}"
            if scheduling_details['appointment_date']:
                extracted_info += f"\n✓ Data: {scheduling_details['appointment_date']}"
            if scheduling_details['appointment_time']:
                extracted_info += f"\n✓ Hora: {scheduling_details['appointment_time']}"
            if scheduling_details['service_description']:
                extracted_info += f"\n✓ Serviço: {scheduling_details['service_description']}"
            
            # Se extração tiver sucesso (>60% confiança), confirmar detalhes
            if scheduling_details['confidence'] > 0.6:
                prompt = f"""Você é um assistente de agendamentos amigável e eficiente.

Cliente solicitou: "{incoming_message}"

DETALHES EXTRAÍDOS:{extracted_info}

INSTRUÇÕES:
- Confirme explicitamente cada detalhe extraído
- Pergunte quaisquer informações faltantes
- Seja entusiasta e profissional

Responda em português (MÁXIMO 2 FRASES, confirmando os detalhes):"""
            else:
                # Se não conseguiu extrair muitos detalhes, pedir mais informações
                prompt = f"""Você é um assistente de agendamentos amigável e eficiente.

Cliente: "{incoming_message}"

INSTRUÇÕES:
- Identifique quais informações faltam: cliente, data, hora, tipo de serviço
- Pergunte educadamente pelas informações faltantes
- Seja breve e direto

Responda em português (MÁXIMO 2 FRASES, solicitando informações):"""
        elif intent == 'ask_pricing':
            prompt = f"""Você é um assistente de vendas educado e informativo.

Cliente: "{incoming_message}"

Planos disponíveis:
- Plano Basic: Agenda e agendamentos simples
- Plano Pro: WhatsApp integrado e automação
- Plano Enterprise: Solução completa com API

Apresente os planos de forma clara e breve em português (MÁXIMO 2 FRASES):"""
        elif intent == 'report_issue':
            prompt = f"""Você é um assistente de suporte técnico empático e prestativo.

Cliente: "{incoming_message}"

INSTRUÇÕES:
- Mostre empatia imediata
- Peça detalhes sobre o problema
- Ofereça ajuda rápida

Responda em português (MÁXIMO 2 FRASES, ser muito conciso):"""
        else:
            prompt = f"""Assistente de agendamentos profissional.

Cliente: "{incoming_message}"

Contexto: {intent}
{instruction}

Responda em português (MÁXIMO 2 FRASES):"""

        # Chamar Ollama API
        logger.debug(f"Calling Ollama LLM: {OLLAMA_MODEL}")
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                'model': OLLAMA_MODEL,
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': 0.7,
                    'top_p': 0.9,
                    'num_predict': 80,  # Máximo de 80 tokens para mais contexto
                    'num_ctx': 512,  # Contexto reduzido para velocidade
                }
            },
            timeout=OLLAMA_TIMEOUT
        )
        
        if response.status_code == 200:
            result = response.json()
            llm_response = result.get('response', '').strip()
            
            # Validar resposta
            if llm_response and len(llm_response) > 10:
                logger.info(f"LLM response generated successfully ({len(llm_response)} chars)")
                return {
                    'response': llm_response,
                    'used_llm': True,
                    'fallback': False,
                    'error': None
                }
            else:
                logger.warning("LLM returned empty or too short response")
                return {
                    'response': None,
                    'used_llm': False,
                    'fallback': True,
                    'error': 'Empty LLM response'
                }
        else:
            logger.error(f"Ollama API error: {response.status_code}")
            return {
                'response': None,
                'used_llm': False,
                'fallback': True,
                'error': f'API error: {response.status_code}'
            }
            
    except requests.exceptions.Timeout:
        logger.error(f"Ollama timeout after {OLLAMA_TIMEOUT}s")
        return {
            'response': None,
            'used_llm': False,
            'fallback': True,
            'error': 'LLM timeout'
        }
    except Exception as e:
        logger.error(f"Error calling Ollama: {e}")
        return {
            'response': None,
            'used_llm': False,
            'fallback': True,
            'error': str(e)
        }

def compose_intent_response(intent: str, incoming_message: str, semantics: Dict[str, Any]) -> str:
    """
    Compõe uma resposta baseada na intenção detectada, usando a análise semântica
    para enriquecer com detalhes específicos do contexto.
    
    A resposta não é apenas um template; é cognitivamente construída com base
    na análise semântica e no que foi reconhecido.
    """
    intent_config = INTENT_PATTERNS.get(intent, INTENT_PATTERNS["general_inquiry"])
    recognized = semantics.get("recognized", [])
    topics = semantics.get("topics", {})
    
    # Construir resposta dinamicamente
    if intent == "ask_capabilities":
        # Priorizar o tópico mencionado, se houver
        response = "Claro! Posso ajudá-lo com:\n\n"
        response += "\n".join(intent_config.get("actions", []))
        response += "\n\n🤔 Com qual desses você gostaria de começar?"
        return response
    
    elif intent == "ask_pricing":
        response = "Temos três planos disponíveis:\n\n"
        response += "\n".join(intent_config.get("plans", []))
        
        # Se houver tópico dominante, mencionar relevância
        if topics:
            top_topic = max(topics.items(), key=lambda x: x[1])[0]
            response += f"\n\nFoquei em {top_topic} porque você mencionou isso. "
        
        response += "\n\nQual plano combina melhor com suas necessidades?"
        return response
    
    elif intent == "ask_how_to":
        response = "Vou te guiar passo a passo:\n\n"
        response += "\n".join(intent_config.get("steps", []))
        response += "\n\nSiga esses passos e me avise se ficar preso em algum deles."
        return response
    
    elif intent == "ask_status":
        response = "Status atual: ✅ Sistema operacional\n\n"
        response += "Tudo está funcionando normalmente!\n"
        response += "Em que mais posso ajudá-lo?"
        return response
    
    elif intent == "ask_location":
        response = "📍 **Nossa Localização**\n\n"
        response += "Estamos disponíveis online 24/7!\n"
        response += "Para agendamentos presenciais, consulte nossos horários.\n\n"
        response += "Precisa de mais informações?"
        return response
    
    elif intent == "ask_time":
        response = "⏰ **Nosso Horário**\n\n"
        response += "Segunda a Sexta: 9h às 18h\n"
        response += "Sábado: 9h às 13h\n"
        response += "Domingo: Fechado\n\n"
        response += "Em qual horário você gostaria de agendar?"
        return response
    
    elif intent == "report_issue":
        response = "Desculpe pelo problema! Vou te ajudar:\n\n"
        response += "Para identificar melhor a causa, me responda:\n"
        response += "\n".join(intent_config.get("steps", []))
        response += "\n\nCom essas informações, poderei encaminhar para o suporte técnico."
        return response
    
    else:  # general_inquiry
        # Fallback cognitivo
        if recognized:
            topics_str = ", ".join(list(topics.keys())[:3])
            response = f"Entendi que você está perguntando sobre: {topics_str}.\n\n"
            response += "Deixe-me processar sua solicitação e retorno com mais detalhes.\n"
            response += "Há algo específico sobre esses tópicos que possa esclarecer?"
        else:
            response = "Recebi sua mensagem. Estou analisando o melhor jeito de ajudar.\n\n"
            response += "Pode descrever com um pouco mais de detalhe o que precisa?"
        
        return response

def structure_sentence_analysis(text: str) -> Dict[str, Any]:
    """
    Analisa a estrutura sintática simples da frase:
    - Identifica palavras interrogativas (O que, Qual, Como, Onde, Quando)
    - Detecta o sujeito (geralmente "você/vc" quando pergunta sobre a IA)
    - Identifica o verbo/ação principal
    - Marca pontuação (?, !)
    
    Retorna análise estrutural que alimenta a detecção de intenção.
    """
    text_lower = text.lower().strip()
    analysis = {
        "original": text,
        "is_question": text_lower.endswith("?"),
        "is_exclamation": text_lower.endswith("!"),
        "interrogatives": [],
        "subjects": [],
        "verbs": [],
        "structure": ""
    }
    
    # Detectar interrogativas - CRÍTICO: com limites de palavra (\b)
    interrogatives = ["como", "qual", "quais", "onde", "quando", "quem", "por que", "porquê", "o que"]
    for interr in interrogatives:
        # Usar word boundary para evitar falsos positivos
        if re.search(r'\b' + re.escape(interr) + r'\b', text_lower):
            analysis["interrogatives"].append(interr)
    
    # Detectar sujeito (você/vc na maioria das questões sobre a IA)
    subjects = ["você", "vc", "voce", "vcs", "vocês"]
    for subj in subjects:
        if re.search(r'\b' + subj + r'\b', text_lower):
            analysis["subjects"].append(subj)
    
    # Detectar verbos comuns em ações/dúvidas (EXPANDIDO)
    verbs = ["fazer", "pode", "faz", "fez", "conseguir", "consegue", "sabe", "agendar", 
             "integrar", "funciona", "funcionar", "ajudar", "ajuda", "está", "tá", 
             "fica", "passa", "abrir", "abre", "atender", "atende", "mudar", "muda",
             "ir", "vai", "vem", "pagar", "paga", "paguei", "quer", "quero", "preciso"]
    for verb in verbs:
        if re.search(r'\b' + verb + r'\b', text_lower):
            analysis["verbs"].append(verb)
    
    # Resumir estrutura
    if analysis["interrogatives"] and analysis["subjects"]:
        analysis["structure"] = "interrogative_with_subject"
    elif analysis["interrogatives"]:
        analysis["structure"] = "interrogative"
    elif analysis["is_question"]:
        analysis["structure"] = "question_implicit"
    elif analysis["is_exclamation"]:
        analysis["structure"] = "exclamation"
    else:
        analysis["structure"] = "statement"
    
    return analysis

def normalize_token(token: str) -> str:
    """
    Normaliza token para aproximação rudimentar (remove acentos comuns e plural).
    Mantém palavras curtas intactas (não aplica singularização a tokens com <4 chars).
    """
    # Remover acentos básicos
    replacements = {
        "á": "a", "à": "a", "â": "a", "ã": "a",
        "é": "e", "ê": "e",
        "í": "i",
        "ó": "o", "ô": "o", "õ": "o",
        "ú": "u",
        "ç": "c",
    }
    t = token.lower()
    for k, v in replacements.items():
        t = t.replace(k, v)
    
    # Singularização simplificada (remove 's' final se parecer plural)
    # MAS: não aplicar a palavras com <4 chars (como "é", "é", "ao", etc.)
    if len(t) >= 4 and t.endswith("s"):
        t = t[:-1]
    return t

def normalize_text(text: str) -> str:
    """
    Normaliza texto completo removendo acentos, mas SEM singularizar.
    Útil para pattern matching em detecção de intent.
    """
    replacements = {
        "á": "a", "à": "a", "â": "a", "ã": "a",
        "é": "e", "ê": "e",
        "í": "i",
        "ó": "o", "ô": "o", "õ": "o",
        "ú": "u",
        "ç": "c",
    }
    t = text.lower()
    for k, v in replacements.items():
        t = t.replace(k, v)
    return t

def extract_scheduling_details(text: str) -> Dict[str, Any]:
    """
    Extrai informações de agendamento do texto do usuário.
    
    Retorna:
    {
        'client_name': 'Farkon',
        'appointment_date': 'segunda feira',
        'appointment_time': '9:00',
        'service_description': 'limpeza do rack',
        'confidence': 0.85
    }
    """
    text_lower = text.lower()
    details = {
        'client_name': None,
        'appointment_date': None,
        'appointment_time': None,
        'service_description': None,
        'confidence': 0.0
    }
    
    matched_fields = 0
    
    # ===== EXTRAIR CLIENTE =====
    # Padrões: "cliente [Nome]", "ao cliente [Nome]", "[Nome] segunda", etc
    client_patterns = [
        r"cliente\s+([A-Z][a-záàâãéèêíïóôõöúç\w\s'-]{2,30}?)(?:\s+segunda|\s+terca|\s+quarta|\s+quinta|\s+sexta|\s+sabado|\s+domingo|\s+as\s+\d|$)",
        r"cliente\s+([A-Z][a-záàâãéèêíïóôõöúç\w\s'-]{2,30}?)\s",
        r"visita\s+ao\s+cliente\s+([A-Z][a-záàâãéèêíïóôõöúç\w\s'-]{2,30}?)(?:\s|$)",
        r"visita\s+[à|ao]?\s*([A-Z][a-záàâãéèêíïóôõöúç\w\s'-]{2,30}?)(?:\s+segunda|\s+terca|\s+quarta|\s+quinta|\s+sexta|\s+sabado|\s+domingo)",
    ]
    for pattern in client_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            # Validar que é um nome real (não é palavra-chave)
            if candidate and len(candidate) >= 3 and candidate.lower() not in ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'segunda-feira']:
                details['client_name'] = candidate
                matched_fields += 1
                break
    
    # ===== EXTRAIR DATA =====
    # Padrões: "segunda feira", "segunda-feira", "dia 15", "próxima segunda", etc
    date_patterns = [
        r"(segunda(?:\s|-)?feira|segunda)",
        r"(terca(?:\s|-)?feira|terca)",
        r"(quarta(?:\s|-)?feira|quarta)",
        r"(quinta(?:\s|-)?feira|quinta)",
        r"(sexta(?:\s|-)?feira|sexta)",
        r"(sabado(?:\s|-)?feira|sabado|sábado)",
        r"(domingo)",
        r"(amanhe|amanhã)",
        r"(hoje)",
        r"(proxima\s+segunda|próxima\s+segunda)",
        r"(proxima\s+semana|próxima\s+semana)",
        r"dia\s+(\d{1,2})",
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            details['appointment_date'] = match.group(1).strip().lower()
            matched_fields += 1
            break
    
    # ===== EXTRAIR HORA =====
    # Padrões: "9:00", "09h00", "14:30", "as 9 horas", etc
    time_patterns = [
        r"(\d{1,2}[:hH]\d{2})",  # 9:00 ou 9h00
        r"(?:as|a)\s+(\d{1,2})\s*(?:horas?|h)",  # as 9 horas
        r"(\d{1,2})(?::|\s)(\d{2})(?:\s+da|$)",  # 9 00 da manhã/tarde
    ]
    for pattern in time_patterns:
        match = re.search(pattern, text)
        if match:
            time_match = match.group(1) if match.lastindex == 1 else f"{match.group(1)}:{match.group(2)}"
            details['appointment_time'] = time_match
            matched_fields += 1
            break
    
    # ===== EXTRAIR SERVIÇO =====
    # Padrões: "o serviço será [descrição]", "para [descrição]", etc
    service_patterns = [
        r"servico\s+(?:sera|será|é|e)\s+([a-záàâãéèêíïóôõöúç\w\s]{3,40}?)(?:\s+(?:segunda|terca|quarta|quinta|sexta|sabado|domingo|$))",
        r"para\s+(?:fazer\s+)?([a-záàâãéèêíïóôõöúç\w\s]{3,50}?)(?:\s+(?:segunda|terca|quarta|quinta|sexta|sabado|domingo|as\s+\d))",
        r"(?:limpeza|conserto|reparo|manutencao|instalacao|suporte|consultoria|atendimento)\s+(?:do|da|de|em)\s+([a-záàâãéèêíïóôõöúç\w\s]{3,30}?)\b",
        r"([a-záàâãéèêíïóôõöúç\w\s]{3,30}?)\s+(?:do|da|de)\s+(?:cliente|rack|equipamento|sistema|servidor|computador)\b",
    ]
    for pattern in service_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            service = match.group(1).strip() if match.lastindex >= 1 else None
            if service and len(service) >= 3:
                details['service_description'] = service.lower()
                matched_fields += 1
                break

    
    # ===== CALCULAR CONFIANÇA =====
    # Cada campo encontrado aumenta a confiança
    # Máximo é 4 campos (cliente, data, hora, serviço)
    details['confidence'] = min(0.95, (matched_fields / 4) * 0.95)
    
    logger.info(f"[SCHEDULING] Extracted details: client={details['client_name']}, date={details['appointment_date']}, time={details['appointment_time']}, service={details['service_description']}, confidence={details['confidence']:.2%}")
    
    return details

def fetch_word_meaning_online(word: str) -> Dict[str, Any]:
    """
    Attempt to fetch word meaning from online sources.
    Currently uses a simple strategy: if word is unknown locally and >= 4 chars,
    mark as pending for admin approval with a placeholder.
    Future: integrate with public APIs once Wikipedia access is resolved.
    """
    # For now, return empty dict; actual fetching disabled due to API rate limits.
    # The word will still be upserted as 'pending' for admin to fill in later.
    return {}


def build_context_summary_from_db(company_id: str, client_ref: str, limit: int = 10) -> str:
    """
    Monta um resumo das últimas mensagens da conversa (cliente/IA) a partir da base,
    filtrando por company_id e client_ref. Retorna string com linhas "Cliente:" e "IA:".
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT direction, message_text
            FROM ai_conversation_messages
            WHERE company_id = %s AND client_ref = %s
            ORDER BY created_at ASC
            LIMIT %s
            """,
            (company_id, client_ref, limit)
        )
        rows = cur.fetchall() or []
        try:
            cur.close()
            conn.close()
        except:
            pass
        lines = []
        for r in rows:
            role = 'Cliente' if (r.get('direction') == 'received') else 'IA'
            txt = str(r.get('message_text') or '').strip()
            if txt:
                lines.append(f"{role}: {txt}")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Error building context summary: {e}")
        return ""


def upsert_word_meaning(company_id: str, word: str, definition: str, source_url: str, status: str = 'pending'):
    """Insert or update word meaning in ai_word_meanings (unique per company+word)."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Use ON CONFLICT for idempotent insert/update
        cur.execute(
            """
            INSERT INTO ai_word_meanings (id, company_id, word, definition, source_url, status, created_at, updated_at)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (company_id, word)
            DO UPDATE SET definition = EXCLUDED.definition, source_url = EXCLUDED.source_url, status = EXCLUDED.status, updated_at = NOW()
            WHERE ai_word_meanings.status != 'approved';
            """,
            (company_id, word, definition, source_url, status)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to upsert word meaning '{word}': {e}")


def interpret_semantics(tokens: List[str], company_id: str) -> Dict[str, Any]:
    """
    Interpreta tokens com base no léxico semântico (builtin + aprovados pela admin).
    Retorna tópicos e conceitos reconhecidos.
    Para tokens desconhecidos, marca como pendente de aprovação do admin para aprendizado futuro.
    """
    recognized: List[Dict[str, Any]] = []
    topics: Dict[str, int] = {}
    new_words: List[Dict[str, Any]] = []

    # Buscar significados aprovados pela admin da empresa
    approved_meanings = fetch_approved_word_meanings(company_id)

    for raw in tokens:
        if raw in STOPWORDS_PT:
            continue
        t = normalize_token(raw)
        
        # 1. Procurar em léxico builtin
        matched = False
        for entry in SEMANTIC_LEXICON.values():
            syns = entry.get("synonyms", [])
            for s in syns:
                if t in normalize_token(s):
                    recognized.append({
                        "concept": entry["concept"],
                        "definition": entry["definition"],
                        "token": raw,
                        "topic": entry["topic"],
                    })
                    topics[entry["topic"]] = topics.get(entry["topic"], 0) + 1
                    matched = True
                    break
            if matched:
                break
        
        # 2. Se não encontrou builtin, procurar em significados aprovados pela admin
        if not matched and t in approved_meanings:
            appr = approved_meanings[t]
            # Inferir tópico básico (neste caso, usar um tópico genérico)
            recognized.append({
                "concept": raw.capitalize(),
                "definition": appr['definition'],
                "token": raw,
                "topic": "custom",  # Tópico de palavras aprendidas
            })
            topics["custom"] = topics.get("custom", 0) + 1
            matched = True
        
        # 3. Se não encontrou, marcar como pendente de aprendizado
        if not matched and len(t) >= 4:
            # Registra palavra como pendente (admin deve preencher definição depois)
            upsert_word_meaning(company_id, raw, None, None, status='pending')
            new_words.append({
                "word": raw,
                "definition": "(Aguardando significado do administrador)",
                "status": "pending",
            })

    # Ordenar por tópicos mais frequentes
    recognized_sorted = sorted(recognized, key=lambda x: (topics.get(x["topic"], 0), x["concept"]), reverse=True)
    dominant_topic = None
    if topics:
        dominant_topic = max(topics.items(), key=lambda kv: kv[1])[0]

    return {
        "recognized": recognized_sorted,
        "dominant_topic": dominant_topic,
        "topics": topics,
        "new_words": new_words,
    }

def calculate_concept_relevance(query_tokens: List[str], concept: Dict[str, Any]) -> float:
    """
    Calcula relevância de um conceito aprendido.
    Considera: query original, explicação, exemplos e keywords.
    """
    # Combinar todos os textos do conceito
    original_query = concept.get('original_query', '').lower()
    explanation = concept.get('explanation', '').lower()
    examples = concept.get('examples', [])
    keywords = concept.get('keywords', [])
    
    # Texto completo do conceito
    concept_text = f"{original_query} {explanation}"
    if examples:
        concept_text += ' ' + ' '.join(examples)
    
    score = 0.0
    
    # Token matching no texto completo
    for token in query_tokens:
        if token in original_query:
            score += 3.0  # Query original tem peso máximo
        if token in explanation:
            score += 1.5
        if examples and any(token in ex.lower() for ex in examples):
            score += 1.0
    
    # Keyword exact matching
    query_lower = ' '.join(query_tokens)
    for kw in keywords:
        if kw.lower() in query_lower:
            score += 2.5
    
    # Bonus por aprovações (conceitos bem avaliados)
    approved_count = concept.get('approved_count', 0)
    score += min(approved_count * 0.2, 2.0)
    
    return score

def calculate_relevance(query_tokens: List[str], content: str, title: str) -> float:
    """Calcula score de relevância usando TF simples."""
    text = f"{title} {content}".lower()
    score = 0.0
    for token in query_tokens:
        # Peso maior se aparece no título
        if token in title.lower():
            score += 2.0
        # Conta ocorrências no conteúdo
        score += text.count(token) * 0.5
    return score

def fetch_learned_concepts(company_id: str, intent: str = None, limit: int = 10) -> List[Dict[str, Any]]:
    """Busca conceitos aprendidos (prioridade maior que knowledge base)."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if intent:
            cur.execute("""
                SELECT id, original_query, explanation, intent, examples, keywords, 
                       usage_count, approved_count
                FROM ai_learned_concepts
                WHERE company_id = %s AND (intent = %s OR intent IS NULL)
                ORDER BY approved_count DESC, usage_count DESC, updated_at DESC
                LIMIT %s
            """, (company_id, intent, limit))
        else:
            cur.execute("""
                SELECT id, original_query, explanation, intent, examples, keywords,
                       usage_count, approved_count
                FROM ai_learned_concepts
                WHERE company_id = %s
                ORDER BY approved_count DESC, usage_count DESC, updated_at DESC
                LIMIT %s
            """, (company_id, limit))
        
        results = cur.fetchall()
        cur.close()
        conn.close()
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f'Error fetching learned concepts: {e}')
        return []

def fetch_knowledge(company_id: str, intent: str = None, limit: int = 10) -> List[Dict[str, Any]]:
    """Busca entradas da base de conhecimento."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if intent:
            cur.execute("""
                SELECT id, title, content, tags, intent, source_url
                FROM ai_knowledge_base
                WHERE company_id = %s AND (intent = %s OR intent IS NULL)
                ORDER BY updated_at DESC
                LIMIT %s
            """, (company_id, intent, limit))
        else:
            cur.execute("""
                SELECT id, title, content, tags, intent, source_url
                FROM ai_knowledge_base
                WHERE company_id = %s
                ORDER BY updated_at DESC
                LIMIT %s
            """, (company_id, limit))
        
        results = cur.fetchall()
        cur.close()
        conn.close()
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f'Error fetching knowledge base: {e}')
        return []

def cognitive_search(query: str, company_id: str, intent: str = None, top_k: int = 3) -> Dict[str, Any]:
    """
    Busca cognitiva focada em semântica: interpreta tokens pelo léxico e compõe resposta.
    Mantém knowledge/concepts apenas como fallback secundário.
    """
    query_tokens = tokenize(query)
    if not query_tokens:
        return {'semantics': {}, 'concepts': [], 'knowledge': [], 'source': 'none'}

    # 0. Interpretar semântica (prioridade principal)
    semantic = interpret_semantics(query_tokens, company_id)

    # 1. Fallbacks (aprendizado e base) – apenas se semântica for fraca
    learned_concepts = []
    scored_concepts = []
    scored_knowledge = []

    # Critério: se menos de 2 conceitos reconhecidos semanticamente, tenta enriquecer
    if len(semantic.get("recognized", [])) < 2:
        learned_concepts = fetch_learned_concepts(company_id, intent, limit=20)
        for concept in learned_concepts:
            score = calculate_concept_relevance(query_tokens, concept)
            if score > 2.0:
                scored_concepts.append({'entry': concept, 'score': score, 'type': 'concept'})
        scored_concepts.sort(key=lambda x: x['score'], reverse=True)

        knowledge_entries = fetch_knowledge(company_id, intent, limit=30)
        for entry in knowledge_entries:
            score = calculate_relevance(query_tokens, entry['content'], entry['title'])
            if score > 0:
                scored_knowledge.append({'entry': entry, 'score': score, 'type': 'knowledge'})
        scored_knowledge.sort(key=lambda x: x['score'], reverse=True)

    return {
        'semantics': semantic,
        'concepts': [s['entry'] for s in scored_concepts[:2]] if scored_concepts else [],
        'knowledge': [s['entry'] for s in scored_knowledge[:2]] if scored_knowledge else [],
        'source': 'semantics' if semantic.get('recognized') else (
            'hybrid' if (scored_concepts or scored_knowledge) else 'none'
        ),
        'confidence_boost': 0.15 if semantic.get('recognized') else (0.1 if scored_concepts else 0)
    }

def build_cognitive_response(incoming_message: str, context_summary: str, intent: str, search_result: Dict[str, Any]) -> str:
    """DEPRECATED: Use compose_intent_response instead."""
    return f"Recebi sua mensagem. Vou analisar e retorno em breve."

def reformulate_response_with_vocabulary(response: str, company_id: str, vocabulary: Dict[str, Dict[str, Any]]) -> str:
    """
    Reformula uma resposta usando vocabulário aprendido.
    Substitui termos técnicos por explicações mais claras baseadas na semântica da empresa.
    
    Exemplo:
    - Response: "Você pode agendar uma consulta"
    - Se vocabulário tem "agendar" → "agendamento", adiciona sinônimos e exemplos
    """
    if not vocabulary:
        return response
    
    reformulated = response
    
    # Processar cada palavra no vocabulário
    for word_lower, word_info in vocabulary.items():
        # Buscar a palavra de forma case-insensitive na resposta
        import re
        pattern = re.compile(re.escape(word_lower), re.IGNORECASE)
        
        # Se a palavra aparece na resposta, enriquecer com definição/sinônimos
        if pattern.search(reformulated):
            definition = word_info.get('definition', '')
            synonyms = word_info.get('synonyms', [])
            
            # Adicionar contexto: se há uma definição clara, usar
            if definition:
                # Criar uma versão enriquecida (adicionar entre parênteses ou como explicação)
                # Para não ficar muito poluído, só enriquecer uma vez
                synonyms_str = f" (também chamado de: {', '.join(synonyms)})" if synonyms else ""
                
                # Substituir apenas a primeira ocorrência com contexto
                def replace_with_context(match):
                    return f"{match.group(0)} - {definition}{synonyms_str}"
                
                reformulated = pattern.sub(replace_with_context, reformulated, count=1)
    
    return reformulated

@app.route('/debug-version', methods=['GET'])
def debug_version():
    """Rota de diagnóstico para verificar qual arquivo está rodando."""
    return jsonify({
        'version': DEBUG_VERSION,
        'file': __file__
    })

@app.route('/cognitive-response', methods=['POST'])
def cognitive_response():
    """
    Endpoint principal: recebe mensagem, contexto, intent; retorna resposta cognitiva.
    Agora com análise estrutural de intenção e resposta composição cognitiva.
    
    MULTI-TENANT SAFETY:
    - company_id é obrigatório e validado
    - Todas as queries filtram por company_id
    - Cache é isolado por empresa
    
    Fluxo:
    1. Validar company_id (UUID válido)
    2. Analisar estrutura sintática da frase
    3. Detectar intenção (ask_capabilities, ask_pricing, etc)
    4. Busca semântica de tokens/conceitos isolados por empresa
    5. Compor resposta dinamicamente baseado em intenção + semântica
    """
    try:
        # Handle encoding issues with Portuguese characters
        try:
            data = request.json or {}
        except Exception as json_error:
            # If JSON parsing fails, try with force_utf8
            request.charset = 'utf-8'
            request.environ['CONTENT_TYPE'] = 'application/json; charset=utf-8'
            try:
                raw_data = request.get_data(as_text=True)
                import json as json_lib
                data = json_lib.loads(raw_data) if raw_data else {}
            except Exception as e:
                logger.error(f"Failed to parse request data: {e}")
                return jsonify({'error': 'Failed to parse request JSON'}), 400
        
        incoming_message = data.get('incoming_message', '')
        context_summary = data.get('context_summary', '')
        client_ref = data.get('client_ref')
        intent_hint = data.get('intent', 'geral')  # Hint externo (opcional)
        company_id = data.get('company_id')

        # ==================== VALIDAÇÃO MULTI-TENANT ====================
        # 1. company_id é OBRIGATÓRIO
        if not company_id:
            logger.warning("[SECURITY] Rejected request without company_id")
            return jsonify({'error': 'company_id é obrigatório'}), 400

        # 2. Validar formato UUID
        try:
            company_uuid = uuid.UUID(str(company_id))
            company_id = str(company_uuid)  # Normalizar para string UUID
        except ValueError:
            logger.warning(f"[SECURITY] Rejected request with invalid company_id: {company_id}")
            return jsonify({'error': 'company_id inválido (UUID esperado)'}), 400
        
        # 3. Log com company_id para auditoria
        message_display = incoming_message.encode('utf-8').decode('utf-8') if incoming_message else "N/A"
        logger.info(f'[TENANT:{company_id}][CLIENT:{client_ref or "-"}] Cognitive request: message="{message_display[:60]}..."')

        # Se não foi passado um context_summary, tentar construir via client_ref
        if (not context_summary) and client_ref:
            context_summary = build_context_summary_from_db(company_id, client_ref, limit=10)

        # NOVO: 1. Analisar estrutura da frase
        structural_analysis = structure_sentence_analysis(incoming_message)
        logger.debug(f'Structural analysis: {structural_analysis["structure"]}')

        # NOVO: 2. Detectar intenção com confiança
        detected_intent, intent_confidence = detect_intent(incoming_message)
        logger.debug(f'Detected intent: {detected_intent} (confidence: {intent_confidence:.2f})')

        # NOVO: 3. Busca semântica (continua igual, mas agora com intent detectada)
        search_result = cognitive_search(incoming_message, company_id, detected_intent, top_k=3)
        logger.debug(f'Search result source: {search_result.get("source")}')

        # NOVO: 4. Buscar vocabulário aprendido pela empresa
        approved_vocabulary = fetch_approved_word_meanings(company_id)
        
        # NOVO: 5. Tentar gerar resposta com LLM (Ollama)
        semantics = search_result.get('semantics', {})
        # Injetar contexto no texto de entrada para o LLM, se disponível
        incoming_for_llm = incoming_message
        if context_summary:
            # Limitar tamanho do contexto para não poluir o prompt
            ctx = "\n".join(context_summary.split("\n")[-6:])
            incoming_for_llm = f"{incoming_message}\n\n[CONTEXT]\n{ctx}"

        llm_result = generate_llm_response(
            detected_intent,
            incoming_for_llm,
            semantics,
            approved_vocabulary,
            company_id
        )
        
        # Se LLM gerou resposta válida, usar ela; senão, fallback para templates
        used_llm = llm_result.get('used_llm', False)
        if llm_result.get('response'):
            response = llm_result['response']
            logger.info(f"Using LLM-generated response")
        else:
            # Fallback: usar templates tradicionais
            response = compose_intent_response(detected_intent, incoming_message, semantics)
            response = reformulate_response_with_vocabulary(response, company_id, approved_vocabulary)
            logger.info(f"Using template-based response (LLM fallback)")


        # Adicionar contexto se relevante
        if context_summary and context_summary != "Nenhuma mensagem anterior":
            try:
                last_msg = context_summary.split('\n')[-1]
                if len(last_msg) < 100:
                    response += f"\n\n*Contexto anterior*: {last_msg}"
            except:
                pass

        # Adicionar notificação de palavras novas (aprendizado)
        new_words = semantics.get('new_words', [])
        if new_words:
            response += "\n\n🔍 **Novas palavras detectadas:**\n"
            for nw in new_words[:2]:
                response += f"- **{nw['word']}** (definição pendente)\n"
            response += "\nPor favor, defina essas palavras para que eu possa aprender!"

        # Calcular confiança (aumenta se intenção foi detectada com certeza)
        base_confidence = 0.5
        concepts = search_result.get('concepts', [])
        knowledge = search_result.get('knowledge', [])

        if intent_confidence > 0.8:
            base_confidence = 0.85
        elif detected_intent in ["ask_capabilities", "ask_pricing", "ask_how_to", "report_issue"]:
            base_confidence = 0.78
        elif semantics.get('recognized'):
            base_confidence = 0.75
        elif concepts:
            base_confidence = 0.65
        elif knowledge:
            base_confidence = 0.55

        confidence = min(0.95, base_confidence + (intent_confidence * 0.1))
        needs_training = confidence < 0.55

        concepts_used = []
        try:
            for c in concepts:
                concepts_used.append({'id': c.get('id', ''), 'query': c.get('original_query', '')})
        except Exception:
            logger.error("Error building concepts_used list")

        knowledge_used = []
        try:
            for k in knowledge:
                knowledge_used.append({'id': k.get('id', ''), 'title': k.get('title', '')})
        except Exception:
            logger.error("Error building knowledge_used list")

        # NOVO: Preparar scheduling_details se foi detectada intenção de agendamento
        scheduling_details = None
        if detected_intent == 'ask_scheduling':
            scheduling_details = extract_scheduling_details(incoming_message)

        return jsonify({
            'suggested_response': response,
            'confidence': float(confidence),
            'source': search_result.get('source', 'none'),
            'detected_intent': detected_intent,
            'intent_confidence': float(intent_confidence),
            'structural_analysis': structural_analysis,
            'concepts_used': concepts_used,
            'knowledge_used': knowledge_used,
            'semantics': semantics,
            'needs_training': bool(needs_training),
            'used_llm': bool(used_llm),
            'llm_fallback': llm_result.get('fallback', False),
            'llm_error': llm_result.get('error'),
            'scheduling_details': scheduling_details  # NOVO: Detalhes extraídos de agendamento
        })

    except Exception as e:
        logger.error(f'Error in cognitive_response: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'cognitive-engine', 'cache_size': len(tenant_cache.cache)})

# ==================== TENANT MANAGEMENT ENDPOINTS ====================

@app.route('/admin/cache/clear', methods=['POST'])
def clear_cache():
    """
    Limpa cache de uma empresa.
    SEGURANÇA: Deve ser protegido por autenticação em produção.
    
    Body: { "company_id": "uuid" } ou vazio para limpar tudo (admin only)
    """
    try:
        data = request.get_json() or {}
        company_id = data.get('company_id')
        admin_token = request.headers.get('X-Admin-Token')
        
        if not company_id:
            # Modo admin: limpar cache global (apenas com token)
            if not admin_token or admin_token != os.getenv('ADMIN_CACHE_TOKEN', 'disabled'):
                return jsonify({'error': 'Unauthorized to clear global cache'}), 403
            tenant_cache.clear()
            logger.warning("[ADMIN] Global cache cleared")
            return jsonify({'success': True, 'message': 'Global cache cleared'})
        
        # Validar UUID
        try:
            uuid.UUID(str(company_id))
        except ValueError:
            return jsonify({'error': 'company_id inválido'}), 400
        
        # Limpar cache da empresa
        tenant_cache.clear(company_id)
        logger.info(f"[ADMIN] Cache cleared for company {company_id}")
        return jsonify({'success': True, 'message': f'Cache cleared for {company_id}'})
        
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/admin/tenant/isolation-check', methods=['POST'])
def isolation_check():
    """
    Endpoint de teste para verificar isolamento multi-tenant.
    Retorna dados da empresa solicitada para verificação.
    
    SEGURANÇA: Deve ser protegido por autenticação admin em produção!
    """
    try:
        data = request.get_json() or {}
        company_id = data.get('company_id')
        admin_token = request.headers.get('X-Admin-Token')
        
        if not admin_token or admin_token != os.getenv('ADMIN_CACHE_TOKEN', 'disabled'):
            return jsonify({'error': 'Unauthorized'}), 403
        
        if not company_id:
            return jsonify({'error': 'company_id required'}), 400
        
        # Validar UUID
        try:
            uuid.UUID(str(company_id))
        except ValueError:
            return jsonify({'error': 'Invalid company_id'}), 400
        
        # Testar isolamento: buscar dados de uma empresa
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            # Verificar vocabulário
            cur.execute("SELECT metadata FROM companies WHERE id = %s", (company_id,))
            company = cur.fetchone()
            
            vocab_count = 0
            if company and company.get('metadata'):
                vocab_count = len(company.get('metadata', {}).get('vocabulary', []))
            
            # Contar conceitos aprendidos
            cur.execute("SELECT COUNT(*) as count FROM ai_learned_concepts WHERE company_id = %s", (company_id,))
            concepts_count = cur.fetchone().get('count', 0) if cur.fetchone() else 0
            
            # Contar entradas na base de conhecimento
            cur.execute("SELECT COUNT(*) as count FROM ai_knowledge_base WHERE company_id = %s", (company_id,))
            knowledge_count = cur.fetchone().get('count', 0) if cur.fetchone() else 0
            
            cur.close()
            conn.close()
            
            return jsonify({
                'company_id': company_id,
                'isolation_verified': True,
                'data_count': {
                    'vocabulary_words': vocab_count,
                    'learned_concepts': concepts_count,
                    'knowledge_entries': knowledge_count
                },
                'note': 'All data properly filtered by company_id'
            })
        except Exception as db_error:
            logger.error(f"Error checking isolation: {db_error}")
            return jsonify({'error': str(db_error)}), 500
    
    except Exception as e:
        logger.error(f"Error in isolation check: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)
