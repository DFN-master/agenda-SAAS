"""
Motor Cognitivo - Cognitive Engine
Sistema de IA local que escolhe e processa conhecimento para gerar respostas inteligentes.
Com análise estrutural de frases para detectar intenção do usuário.
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

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/agenda')
DEBUG_VERSION = "semantic-2026-01-09T23:55Z"

# Log startup info
logger.info(f"Cognitive Engine Starting")
logger.info(f"DATABASE_URL set: {bool(os.getenv('DATABASE_URL'))}")
logger.info(f"DATABASE_URL value: {DATABASE_URL[:50]}..." if len(DATABASE_URL) > 50 else f"DATABASE_URL: {DATABASE_URL}")

print("[STARTUP] Flask app initialized", flush=True)
import sys
sys.stdout.flush()
sys.stderr.flush()

def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def fetch_approved_word_meanings(company_id: str) -> Dict[str, Dict[str, Any]]:
    """Busca significados de palavras aprovados pela admin para usar no léxico local."""
    meanings: Dict[str, Dict[str, Any]] = {}
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, word, definition
            FROM ai_word_meanings
            WHERE company_id = %s AND status = 'approved'
        """, (company_id,))
        results = cur.fetchall()
        cur.close()
        conn.close()
        for row in results:
            word = row.get('word', '').lower().strip()
            if word:
                meanings[word] = {
                    'id': row.get('id'),
                    'definition': row.get('definition'),
                }
    except Exception as e:
        logger.error(f"Failed to fetch approved word meanings: {e}")
    return meanings

def tokenize(text: str) -> List[str]:
    """Tokeniza texto em palavras relevantes (3+ caracteres)."""
    words = re.findall(r'\b\w{3,}\b', text.lower())
    return words

# Léxico semântico básico (pt-BR): mapeia palavras a conceitos e significados
# Objetivo: fornecer ao motor cognitivo o "significado das palavras" sem depender
# de respostas pré-cadastradas no banco.
SEMANTIC_LEXICON: Dict[str, Dict[str, Any]] = {
    # Planos e preços
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
    "para", "por", "com", "sem", "em", "no", "na", "nos", "nas", "que", "qual", "quais",
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
    "ask_pricing": {
        "patterns": [
            r"(?:qual|quais?|quanto).*(?:prec|cust|val|tarifas?)",
            r"(?:prec|cust|val|tarifas?).*(?:de|dos?|da)",
            r"plano",
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
            r"como.*(?:fazer|usar|agendar|integrar)",
            r"(?:como|de que forma|qual a forma).*",
        ],
        "response_template": "Para {action}:\n{steps}\n\nPrecisa de mais detalhes?",
        "steps": [
            "1️⃣ Acesse o painel de controle",
            "2️⃣ Clique em {section}",
            "3️⃣ Preencha os dados solicitados",
            "4️⃣ Confirme a ação",
        ]
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
    - "Como agendar?" → ("ask_how_to", 0.85)
    - "Tenho um problema" → ("report_issue", 0.8)
    """
    text_lower = text.lower()
    best_match = "general_inquiry"
    best_confidence = 0.5
    
    for intent_name, intent_data in INTENT_PATTERNS.items():
        if intent_name == "general_inquiry":
            continue  # Fallback, pula para agora
        
        patterns = intent_data.get("patterns", [])
        for pattern in patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                # Calcular confiança baseado em quantas palavras-chave aparecem
                confidence = 0.8 + (len(match.group(0)) / len(text)) * 0.15
                confidence = min(0.95, confidence)
                
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_match = intent_name
    
    return best_match, best_confidence

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
    - Identifica palavras interrogativas (O que, Qual, Como)
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
    
    # Detectar interrogativas
    interrogatives = ["o que", "qual", "quais", "como", "por que", "porquê", "quando", "onde", "quem"]
    for interr in interrogatives:
        if interr in text_lower:
            analysis["interrogatives"].append(interr)
    
    # Detectar sujeito (você/vc na maioria das questões sobre a IA)
    subjects = ["você", "vc", "voce", "vcs", "vocês"]
    for subj in subjects:
        if re.search(r'\b' + subj + r'\b', text_lower):
            analysis["subjects"].append(subj)
    
    # Detectar verbos comuns em ações/dúvidas
    verbs = ["fazer", "pode", "faz", "fez", "conseguir", "consegue", "sabe", "agendar", 
             "integrar", "funciona", "funcionar", "ajudar", "ajuda"]
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
    """Normaliza token para aproximação rudimentar (remove acentos comuns e plural)."""
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
    if len(t) > 4 and t.endswith("s"):
        t = t[:-1]
    return t

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
    
    Fluxo:
    1. Analisar estrutura sintática da frase
    2. Detectar intenção (ask_capabilities, ask_pricing, etc)
    3. Busca semântica de tokens/conceitos
    4. Compor resposta dinamicamente baseado em intenção + semântica
    """
    try:
        data = request.json or {}
        incoming_message = data.get('incoming_message', '')
        context_summary = data.get('context_summary', '')
        intent_hint = data.get('intent', 'geral')  # Hint externo (opcional)
        company_id = data.get('company_id')

        if not company_id:
            return jsonify({'error': 'company_id é obrigatório'}), 400

        # Validação básica de UUID para evitar erros de sintaxe no banco
        try:
            uuid.UUID(str(company_id))
        except ValueError:
            return jsonify({'error': 'company_id inválido (UUID esperado)'}), 400

        logger.debug(f'Received request: company_id={company_id}, message="{incoming_message[:50]}..."')

        # NOVO: 1. Analisar estrutura da frase
        structural_analysis = structure_sentence_analysis(incoming_message)
        logger.debug(f'Structural analysis: {structural_analysis["structure"]}')

        # NOVO: 2. Detectar intenção com confiança
        detected_intent, intent_confidence = detect_intent(incoming_message)
        logger.debug(f'Detected intent: {detected_intent} (confidence: {intent_confidence:.2f})')

        # 3. Busca semântica (continua igual, mas agora com intent detectada)
        search_result = cognitive_search(incoming_message, company_id, detected_intent, top_k=3)
        logger.debug(f'Search result source: {search_result.get("source")}')

        # NOVO: 4. Compor resposta baseado em intenção detectada + análise semântica
        semantics = search_result.get('semantics', {})
        response = compose_intent_response(detected_intent, incoming_message, semantics)

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
            'needs_training': bool(needs_training)
        })
    except Exception as e:
        logger.error(f'Error in cognitive_response: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'cognitive-engine'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)
