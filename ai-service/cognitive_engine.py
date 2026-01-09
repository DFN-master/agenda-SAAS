"""
Motor Cognitivo - Cognitive Engine
Sistema de IA local que escolhe e processa conhecimento para gerar respostas inteligentes.
"""
import os
import re
import uuid
import logging
from flask import Flask, request, jsonify
from typing import List, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

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

def interpret_semantics(tokens: List[str]) -> Dict[str, Any]:
    """
    Interpreta tokens com base no léxico semântico, retornando tópicos e conceitos reconhecidos.
    Não usa respostas do banco; apenas significados das palavras e sinônimos.
    """
    recognized: List[Dict[str, Any]] = []
    topics: Dict[str, int] = {}

    for raw in tokens:
        if raw in STOPWORDS_PT:
            continue
        t = normalize_token(raw)
        # Procurar em todas as entradas do léxico por sinônimos que contenham o token
        for key, entry in SEMANTIC_LEXICON.items():
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
                    break

    # Ordenar por tópicos mais frequentes
    recognized_sorted = sorted(recognized, key=lambda x: (topics.get(x["topic"], 0), x["concept"]), reverse=True)
    dominant_topic = None
    if topics:
        dominant_topic = max(topics.items(), key=lambda kv: kv[1])[0]

    return {
        "recognized": recognized_sorted,
        "dominant_topic": dominant_topic,
        "topics": topics,
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
    semantic = interpret_semantics(query_tokens)

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
    """
    Constrói resposta estruturada semântica: usa significados de palavras para compor a resposta.
    Evita recuperar respostas prontas; pode usar aprendizados/knowledge apenas como suporte.
    """
    try:
        concepts = search_result.get('concepts', [])
        knowledge = search_result.get('knowledge', [])
        semantics = search_result.get('semantics', {})

        recognized = semantics.get('recognized', [])
        dominant_topic = semantics.get('dominant_topic')

        response_parts = []

        # Introdução baseada no tópico dominante
        if recognized:
            if dominant_topic:
                response_parts.append(f"Entendi o tema principal: **{dominant_topic}**. ")
            else:
                response_parts.append("Entendi o que você está perguntando. ")

            # Explicar com base nos significados das palavras
            explained = []
            for item in recognized[:3]:
                c = item.get('concept')
                d = item.get('definition')
                if c and d and c not in explained:
                    response_parts.append(f"\n📚 **{c.capitalize()}**: {d}")
                    explained.append(c)

            # Compor orientação/proposta de resposta de forma generativa
            guidance = []
            if any(x.get('concept') == 'preço' for x in recognized):
                guidance.append("Posso te informar os valores e diferenças entre os planos.")
            if any(x.get('concept') == 'planos' for x in recognized):
                guidance.append("Temos diferentes planos com características específicas; posso detalhar conforme sua necessidade.")
            if any(x.get('concept') == 'agendamento' for x in recognized):
                guidance.append("Se preferir, posso sugerir datas e horários disponíveis para agendar.")
            if any(x.get('concept') == 'suporte' for x in recognized):
                guidance.append("Descreva o problema e eu oriento os próximos passos ou encaminho ao suporte técnico.")

            if guidance:
                response_parts.append("\n\n" + " ".join(guidance))
        else:
            # Sem semântica suficiente – fallback leve
            response_parts.append(f"Recebi sua mensagem sobre {intent}. Estou analisando para formular a melhor resposta.")

        # Contexto resumido se houver
        if context_summary and context_summary != "Nenhuma mensagem anterior":
            try:
                last_msgs = context_summary.split('\n')[-2:]
                context_note = f"\n\n📋 *Contexto*: {' | '.join(last_msgs)}"
                response_parts.append(context_note)
            except:
                pass

        # Complemento opcional com conhecimento/aprendizado (não respostas prontas)
        if concepts or knowledge:
            response_parts.append("\n\nTambém posso considerar informações internas para enriquecer a resposta.")

        footer = "\n\nPosso esclarecer algo mais específico?"
        response_parts.append(footer)

        return ''.join(response_parts)
    except Exception as e:
        logger.error(f"Error building cognitive response: {e}")
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
    Prioriza conceitos aprendidos e aplica fallback para base de conhecimento.
    """
    try:
        data = request.json or {}
        incoming_message = data.get('incoming_message', '')
        context_summary = data.get('context_summary', '')
        intent = data.get('intent', 'geral')
        company_id = data.get('company_id')

        if not company_id:
            return jsonify({'error': 'company_id é obrigatório'}), 400

        # Validação básica de UUID para evitar erros de sintaxe no banco
        try:
            uuid.UUID(str(company_id))
        except ValueError:
            return jsonify({'error': 'company_id inválido (UUID esperado)'}), 400

        logger.debug(f'Received request: company_id={company_id}, intent={intent}')

        # Busca cognitiva com prioridade à semântica
        search_result = cognitive_search(incoming_message, company_id, intent, top_k=3)
        logger.debug(f'Search result source: {search_result.get("source")}')

        # Constrói resposta
        response = build_cognitive_response(incoming_message, context_summary, intent, search_result)

        # Confiança: maior se usou conceitos aprendidos
        base_confidence = 0.5
        concepts = search_result.get('concepts', [])
        knowledge = search_result.get('knowledge', [])
        semantics = search_result.get('semantics', {})
        confidence_boost = search_result.get('confidence_boost', 0)

        if semantics.get('recognized'):
            base_confidence = 0.75 + confidence_boost
        elif concepts:
            base_confidence = 0.65 + confidence_boost
        elif knowledge:
            base_confidence = 0.55 + (len(knowledge) * 0.05)

        confidence = min(0.95, base_confidence)
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
            'concepts_used': concepts_used,
            'knowledge_used': knowledge_used,
            'semantics': semantics,  # inclui tópicos e tokens reconhecidos
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
