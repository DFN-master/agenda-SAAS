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
DEBUG_VERSION = "debug-2026-01-09T23:22Z"

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
    Busca cognitiva avançada: prioriza conceitos aprendidos, depois knowledge base.
    Retorna dicionário com conceitos e conhecimento ranqueados.
    """
    query_tokens = tokenize(query)
    if not query_tokens:
        return {'concepts': [], 'knowledge': [], 'source': 'none'}
    
    # 1. Buscar conceitos aprendidos (prioridade máxima)
    learned_concepts = fetch_learned_concepts(company_id, intent, limit=30)
    
    scored_concepts = []
    for concept in learned_concepts:
        score = calculate_concept_relevance(query_tokens, concept)
        if score > 2.0:  # Threshold mais alto para conceitos
            scored_concepts.append({'entry': concept, 'score': score, 'type': 'concept'})
    
    scored_concepts.sort(key=lambda x: x['score'], reverse=True)
    
    # Se encontrou conceitos relevantes, prioriza eles
    if scored_concepts and scored_concepts[0]['score'] > 5.0:
        # Alta confiança no conceito aprendido
        return {
            'concepts': [s['entry'] for s in scored_concepts[:top_k]],
            'knowledge': [],
            'source': 'learned_concepts',
            'confidence_boost': 0.2  # Conceitos aprendidos dão boost de confiança
        }
    
    # 2. Buscar na knowledge base
    knowledge_entries = fetch_knowledge(company_id, intent, limit=50)
    
    scored_knowledge = []
    for entry in knowledge_entries:
        score = calculate_relevance(query_tokens, entry['content'], entry['title'])
        if score > 0:
            scored_knowledge.append({'entry': entry, 'score': score, 'type': 'knowledge'})
    
    scored_knowledge.sort(key=lambda x: x['score'], reverse=True)
    
    # 3. Combinar resultados
    top_concepts = [s['entry'] for s in scored_concepts[:2]] if scored_concepts else []
    top_knowledge = [s['entry'] for s in scored_knowledge[:2]] if scored_knowledge else []
    
    return {
        'concepts': top_concepts,
        'knowledge': top_knowledge,
        'source': 'hybrid' if (top_concepts and top_knowledge) else ('concepts' if top_concepts else 'knowledge'),
        'confidence_boost': 0.1 if top_concepts else 0
    }

def build_cognitive_response(incoming_message: str, context_summary: str, intent: str, search_result: Dict[str, Any]) -> str:
    """
    Constrói resposta estruturada priorizando conceitos aprendidos.
    """
    try:
        concepts = search_result.get('concepts', [])
        knowledge = search_result.get('knowledge', [])
        
        if not concepts and not knowledge:
            return f"Recebi sua mensagem sobre {intent}. Estou aprendendo sobre esse assunto. Poderia me explicar um pouco mais para que eu possa te ajudar melhor?"
        
        response_parts = []
        
        # Se há conceitos aprendidos, usar explicações deles
        if concepts:
            intro = f"Entendi! Esse tipo de pergunta se refere a **{intent}**."
            response_parts.append(intro)
            
            for i, concept in enumerate(concepts[:2], 1):
                try:
                    explanation = concept.get('explanation', 'sem explicação')
                    original_query = concept.get('original_query', 'conceito aprendido')
                    examples = concept.get('examples', [])
                    
                    response_parts.append(f"\n📚 **{original_query}**")
                    response_parts.append(f"{explanation}")
                    
                    if examples and len(examples) > 0:
                        response_parts.append(f"\n*Exemplos*: {examples[0]}")
                except Exception as e:
                    logger.error(f"Error processing concept {i}: {e}")
                    continue
        
        # Adicionar conhecimento da base se disponível
        if knowledge:
            if not concepts:
                intro = f"Aqui está o que encontrei sobre **{intent}**:"
                response_parts.append(intro)
            
            for i, entry in enumerate(knowledge[:2], 1):
                try:
                    snippet = entry.get('content', '')[:180].strip()
                    if len(entry.get('content', '')) > 180:
                        snippet += '...'
                    title = entry.get('title', 'Resultado')
                    response_parts.append(f"\n{i}. **{title}**: {snippet}")
                except Exception as e:
                    logger.error(f"Error processing knowledge entry {i}: {e}")
                    continue
        
        # Contexto resumido se houver
        if context_summary and context_summary != "Nenhuma mensagem anterior":
            try:
                last_msgs = context_summary.split('\n')[-2:]
                context_note = f"\n\n📋 *Contexto*: {' | '.join(last_msgs)}"
                response_parts.append(context_note)
            except:
                pass
        
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

        # Busca cognitiva (prioriza conceitos aprendidos)
        search_result = cognitive_search(incoming_message, company_id, intent, top_k=3)
        logger.debug(f'Search result source: {search_result.get("source")}')

        # Constrói resposta
        response = build_cognitive_response(incoming_message, context_summary, intent, search_result)

        # Confiança: maior se usou conceitos aprendidos
        base_confidence = 0.4
        concepts = search_result.get('concepts', [])
        knowledge = search_result.get('knowledge', [])
        confidence_boost = search_result.get('confidence_boost', 0)

        if concepts:
            base_confidence = 0.75 + confidence_boost
        elif knowledge:
            base_confidence = 0.6 + (len(knowledge) * 0.05)

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
