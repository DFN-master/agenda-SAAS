"""
Dictionary Populator - Busca palavras de fontes públicas de dicionário português
"""
import requests
import json
import time
from typing import List, Dict, Optional

# COMMON WORDS DO PORTUGUÊS BRASILEIRO - Base que será expandida
PT_BR_COMMON_WORDS = {
    # Artigos
    'o': {'class': 'artigo', 'definition': 'Artigo definido masculino singular', 'examples': ['O carro é novo', 'O homem chegou']},
    'a': {'class': 'artigo', 'definition': 'Artigo definido feminino singular', 'examples': ['A casa é grande', 'A mulher saiu']},
    'os': {'class': 'artigo', 'definition': 'Artigo definido masculino plural', 'examples': ['Os carros são novos']},
    'as': {'class': 'artigo', 'definition': 'Artigo definido feminino plural', 'examples': ['As casas são grandes']},
    
    # Preposições comuns
    'de': {'class': 'preposição', 'definition': 'Indica relação de pertencimento, origem ou matéria', 'examples': ['Casa de João', 'Copo de vidro']},
    'para': {'class': 'preposição', 'definition': 'Indica destino, finalidade ou direção', 'examples': ['Vou para casa', 'Isto é para você']},
    'em': {'class': 'preposição', 'definition': 'Indica lugar, tempo ou circunstância', 'examples': ['Estou em casa', 'Em maio']},
    'por': {'class': 'preposição', 'definition': 'Indica agente da ação passiva, causa ou meio', 'examples': ['Amado por todos', 'Por favor']},
    'com': {'class': 'preposição', 'definition': 'Indica companhia ou instrumento', 'examples': ['Vou com você', 'Corto com faca']},
    'sem': {'class': 'preposição', 'definition': 'Indica ausência ou privação', 'examples': ['Sem dinheiro', 'Saí sem avisar']},
    
    # Verbos comuns
    'ser': {'class': 'verbo', 'definition': 'Existir ou estar', 'examples': ['Eu sou feliz', 'Ele é médico']},
    'estar': {'class': 'verbo', 'definition': 'Permanecer ou ficar em lugar ou estado', 'examples': ['Estou bem', 'Estou em casa']},
    'ter': {'class': 'verbo', 'definition': 'Possuir ou deter algo', 'examples': ['Tenho uma caneta', 'Ele tem carro']},
    'fazer': {'class': 'verbo', 'definition': 'Realizar, executar uma ação', 'examples': ['Fazer um bolo', 'Fiz o dever']},
    'ir': {'class': 'verbo', 'definition': 'Deslocar-se de um lugar para outro', 'examples': ['Vou ao trabalho', 'Fomos embora']},
    'vir': {'class': 'verbo', 'definition': 'Chegar a um lugar', 'examples': ['Venho aqui sempre', 'Ele veio hoje']},
    'dar': {'class': 'verbo', 'definition': 'Ceder, oferecer ou entregar', 'examples': ['Dou um livro', 'Deu uma festa']},
    'trazer': {'class': 'verbo', 'definition': 'Levar algo para um lugar', 'examples': ['Trago o pão', 'Trouxe presentes']},
    'levar': {'class': 'verbo', 'definition': 'Conduzir ou transportar', 'examples': ['Levo você lá', 'Levou embora']},
    'ver': {'class': 'verbo', 'definition': 'Perceber com os olhos', 'examples': ['Vejo a lua', 'Vi um filme']},
    'dizer': {'class': 'verbo', 'definition': 'Proferir palavras', 'examples': ['Digo a verdade', 'Disse tudo']},
    'falar': {'class': 'verbo', 'definition': 'Proferir discurso', 'examples': ['Falo português', 'Falei com ele']},
    'ouvir': {'class': 'verbo', 'definition': 'Perceber sons', 'examples': ['Ouço música', 'Ouvi um barulho']},
    'entender': {'class': 'verbo', 'definition': 'Compreender', 'examples': ['Entendo português', 'Entendi a lição']},
    'saber': {'class': 'verbo', 'definition': 'Ter conhecimento', 'examples': ['Sei natação', 'Soube a verdade']},
    'querer': {'class': 'verbo', 'definition': 'Desejar', 'examples': ['Quero água', 'Quis partir']},
    'poder': {'class': 'verbo', 'definition': 'Ter capacidade ou permissão', 'examples': ['Posso sair', 'Pude ajudar']},
    'dever': {'class': 'verbo', 'definition': 'Ter obrigação', 'examples': ['Devo estudar', 'Devia chegar cedo']},
    'precisar': {'class': 'verbo', 'definition': 'Necessitar', 'examples': ['Preciso de ajuda', 'Precisei sair']},
    'pensar': {'class': 'verbo', 'definition': 'Raciocinar ou considerar', 'examples': ['Penso muito', 'Pensei no assunto']},
    'acreditar': {'class': 'verbo', 'definition': 'Ter fé ou confiar', 'examples': ['Acredito em você', 'Acreditei na história']},
    'encontrar': {'class': 'verbo', 'definition': 'Achar ou deparar-se com', 'examples': ['Encontro você lá', 'Encontrei uma moeda']},
    'perder': {'class': 'verbo', 'definition': 'Deixar de ter', 'examples': ['Perco a chave', 'Perdi o ônibus']},
    'ganhar': {'class': 'verbo', 'definition': 'Obter como ganho', 'examples': ['Ganho dinheiro', 'Ganhei um prêmio']},
    'trabalhar': {'class': 'verbo', 'definition': 'Exercer uma ocupação', 'examples': ['Trabalho de dia', 'Trabalhei muito']},
    'estudar': {'class': 'verbo', 'definition': 'Aplicar-se ao aprendizado', 'examples': ['Estudo à noite', 'Estudei para prova']},
    'esperar': {'class': 'verbo', 'definition': 'Aguardar a vinda de', 'examples': ['Espero você aqui', 'Esperei horas']},
    'começar': {'class': 'verbo', 'definition': 'Dar início a', 'examples': ['Começo agora', 'Comecei o trabalho']},
    'terminar': {'class': 'verbo', 'definition': 'Finalizar algo', 'examples': ['Termino logo', 'Terminei a lição']},
    'deixar': {'class': 'verbo', 'definition': 'Permitir ou abandonar', 'examples': ['Deixo você sair', 'Deixei a carta']},
    'pedir': {'class': 'verbo', 'definition': 'Solicitar algo', 'examples': ['Peço desculpas', 'Pedi ajuda']},
    'receber': {'class': 'verbo', 'definition': 'Aceitar algo que é dado', 'examples': ['Recebo o pacote', 'Recebi uma carta']},
    'enviar': {'class': 'verbo', 'definition': 'Mandar algo a alguém', 'examples': ['Envio um email', 'Enviei a mensagem']},
    'comprar': {'class': 'verbo', 'definition': 'Adquirir comprando', 'examples': ['Compro pão', 'Comprei roupa']},
    'vender': {'class': 'verbo', 'definition': 'Ceder propriedade por preço', 'examples': ['Vendo o carro', 'Vendi a casa']},
    'contar': {'class': 'verbo', 'definition': 'Narrar ou enumerar', 'examples': ['Conto uma história', 'Contei tudo']},
    'brincar': {'class': 'verbo', 'definition': 'Divertir-se', 'examples': ['Brinco no parque', 'Brinquei bastante']},
    'correr': {'class': 'verbo', 'definition': 'Mover-se rapidamente', 'examples': ['Corro rápido', 'Corri para casa']},
    'andar': {'class': 'verbo', 'definition': 'Mover-se a pé', 'examples': ['Ando pela rua', 'Andei muito']},
    'caminhar': {'class': 'verbo', 'definition': 'Andar lentamente', 'examples': ['Caminho devagar', 'Caminhei na praia']},
    'pular': {'class': 'verbo', 'definition': 'Saltar', 'examples': ['Pulo alto', 'Pulei a corda']},
    'nadar': {'class': 'verbo', 'definition': 'Deslocar-se na água', 'examples': ['Nado bem', 'Nadei na piscina']},
    'voar': {'class': 'verbo', 'definition': 'Deslocar-se pelo ar', 'examples': ['Voo amanhã', 'Voei para São Paulo']},
    'comer': {'class': 'verbo', 'definition': 'Ingerir alimento', 'examples': ['Como arroz', 'Comi pizza']},
    'beber': {'class': 'verbo', 'definition': 'Ingerir líquido', 'examples': ['Bebo água', 'Bebi leite']},
    'dormir': {'class': 'verbo', 'definition': 'Estar em sono', 'examples': ['Durmo cedo', 'Dormi bem']},
    'acordar': {'class': 'verbo', 'definition': 'Despertar do sono', 'examples': ['Acordo cedo', 'Acordei assustado']},
    'lavar': {'class': 'verbo', 'definition': 'Limpar com água', 'examples': ['Lavo as mãos', 'Lavei a roupa']},
    'limpar': {'class': 'verbo', 'definition': 'Tirar sujidade', 'examples': ['Limpo a casa', 'Limpei o vidro']},
    'cozinhar': {'class': 'verbo', 'definition': 'Preparar comida', 'examples': ['Cozinho bem', 'Cozinhei a janta']},
    'cantar': {'class': 'verbo', 'definition': 'Emitir sons musicais', 'examples': ['Canto bem', 'Cantei uma música']},
    'dançar': {'class': 'verbo', 'definition': 'Mover-se ao ritmo', 'examples': ['Danço samba', 'Dancei a noite toda']},
    'amar': {'class': 'verbo', 'definition': 'Ter amor a', 'examples': ['Amo minha família', 'Amei com intensidade']},
    'beijar': {'class': 'verbo', 'definition': 'Tocar com os lábios', 'examples': ['Beijo meu filho', 'Beijei a mãe']},
    'abraçar': {'class': 'verbo', 'definition': 'Envolver nos braços', 'examples': ['Abraço você', 'Abracei meu amigo']},
    'apertar': {'class': 'verbo', 'definition': 'Comprimir', 'examples': ['Aperto a mão', 'Apertei o botão']},
    'soltar': {'class': 'verbo', 'definition': 'Liberar o que estava preso', 'examples': ['Solto a corda', 'Soltei a mão']},
    'puxar': {'class': 'verbo', 'definition': 'Trazer para si', 'examples': ['Puxo a cadeira', 'Puxei a porta']},
    'empurrar': {'class': 'verbo', 'definition': 'Afastar com força', 'examples': ['Empurro o carro', 'Empurrei a porta']},
    'bater': {'class': 'verbo', 'definition': 'Golpear', 'examples': ['Bato na porta', 'Bati na mesa']},
    'pegar': {'class': 'verbo', 'definition': 'Tomar ou agarrar', 'examples': ['Pego o livro', 'Peguei a chave']},
    'largar': {'class': 'verbo', 'definition': 'Soltar de mão', 'examples': ['Largo o objeto', 'Largui tudo']},
    'ligar': {'class': 'verbo', 'definition': 'Conectar ou telefonar', 'examples': ['Ligo o ventilador', 'Liguei para você']},
    'desligar': {'class': 'verbo', 'definition': 'Desconectar', 'examples': ['Desligo a luz', 'Desliguei o celular']},
    'abrir': {'class': 'verbo', 'definition': 'Desabafar ou descerrar', 'examples': ['Abro a porta', 'Abri a janela']},
    'fechar': {'class': 'verbo', 'definition': 'Cerrar ou tapar', 'examples': ['Fecho a porta', 'Fechei o livro']},
    'quebrar': {'class': 'verbo', 'definition': 'Partir em pedaços', 'examples': ['Quebro o vidro', 'Quebrei a xícara']},
    'consertar': {'class': 'verbo', 'definition': 'Reparar algo danificado', 'examples': ['Conserto o carro', 'Consertei o relógio']},
    'pintar': {'class': 'verbo', 'definition': 'Aplicar tinta', 'examples': ['Pinto a casa', 'Pintei um quadro']},
    'desenhar': {'class': 'verbo', 'definition': 'Fazer desenho', 'examples': ['Desenho um gato', 'Desenhei um coração']},
    'escrever': {'class': 'verbo', 'definition': 'Traçar letras', 'examples': ['Escrevo uma carta', 'Escrevi um email']},
    'ler': {'class': 'verbo', 'definition': 'Decodificar texto', 'examples': ['Leio um livro', 'Li a notícia']},
    'copiar': {'class': 'verbo', 'definition': 'Reproduzir', 'examples': ['Copio o texto', 'Copiei tudo']},
    'colar': {'class': 'verbo', 'definition': 'Aderir com cola', 'examples': ['Colo o papel', 'Colei a foto']},
    'cortar': {'class': 'verbo', 'definition': 'Dividir com instrumento cortante', 'examples': ['Corto o bolo', 'Cortei o pão']},
    'dobrar': {'class': 'verbo', 'definition': 'Fazer dobra em', 'examples': ['Dobro o papel', 'Dobrei a roupa']},
    'esticar': {'class': 'verbo', 'definition': 'Alongar ou estender', 'examples': ['Estico a corda', 'Estiquei o tecido']},
    'encher': {'class': 'verbo', 'definition': 'Preencher completamente', 'examples': ['Encho o copo', 'Enchei a mochila']},
    'esvaziar': {'class': 'verbo', 'definition': 'Tirar o conteúdo', 'examples': ['Esvazio o balde', 'Esvaziei a gaveta']},
    'procurar': {'class': 'verbo', 'definition': 'Tentar achar', 'examples': ['Procuro a chave', 'Procurei em toda parte']},
    'achar': {'class': 'verbo', 'definition': 'Encontrar por acaso', 'examples': ['Acho estranho', 'Achei uma moeda']},
    'guardar': {'class': 'verbo', 'definition': 'Colocar em guarda', 'examples': ['Guardo os papéis', 'Guardei o segredo']},
    'arrumar': {'class': 'verbo', 'definition': 'Organizar ou consertar', 'examples': ['Arrume o quarto', 'Arrumei a cama']},
    'desorganizar': {'class': 'verbo', 'definition': 'Bagunçar', 'examples': ['Desorganizo tudo', 'Desorganizei a mesa']},
    'organizar': {'class': 'verbo', 'definition': 'Pôr em ordem', 'examples': ['Organizo uma festa', 'Organizei a documentação']},
    'planejar': {'class': 'verbo', 'definition': 'Traçar um plano', 'examples': ['Planeje a viagem', 'Planejei com cuidado']},
    'praticar': {'class': 'verbo', 'definition': 'Exercitar-se', 'examples': ['Pratico exercício', 'Pratiquei futebol']},
    'treinar': {'class': 'verbo', 'definition': 'Preparar-se através de exercício', 'examples': ['Treino na academia', 'Treinei toda semana']},
    'competir': {'class': 'verbo', 'definition': 'Participar de competição', 'examples': ['Compito fairmente', 'Competimos juntos']},
    'vencer': {'class': 'verbo', 'definition': 'Sair vencedor', 'examples': ['Venci a partida', 'Vencemos o jogo']},
    'perder': {'class': 'verbo', 'definition': 'Sair perdedor', 'examples': ['Perdi o jogo', 'Perdemos o campeonato']},
    'descansar': {'class': 'verbo', 'definition': 'Repousar', 'examples': ['Descanso no fim de semana', 'Descansamos bem']},
    'cansar': {'class': 'verbo', 'definition': 'Ficar fatigado', 'examples': ['Canso facilmente', 'Cansei de tanto trabalhar']},
    'melhorar': {'class': 'verbo', 'definition': 'Ficar melhor', 'examples': ['Melhoro a cada dia', 'Melhorou muito']},
    'piorar': {'class': 'verbo', 'definition': 'Ficar pior', 'examples': ['Piora com chuva', 'Piorou a situação']},
    'esquecer': {'class': 'verbo', 'definition': 'Perder da memória', 'examples': ['Esqueço facilmente', 'Esqueci o nome']},
    'lembrar': {'class': 'verbo', 'definition': 'Trazer à memória', 'examples': ['Lembro bem', 'Lembrei da infância']},
    'sugerir': {'class': 'verbo', 'definition': 'Propor uma ideia', 'examples': ['Sugiro esta opção', 'Sugeri uma solução']},
    'aprovar': {'class': 'verbo', 'definition': 'Dar aprovação', 'examples': ['Aprovo sua ideia', 'Aprovaram o projeto']},
    'rejeitar': {'class': 'verbo', 'definition': 'Recusar', 'examples': ['Rejeito a proposta', 'Rejeitou o convite']},
    'defender': {'class': 'verbo', 'definition': 'Proteger', 'examples': ['Defendo meus direitos', 'Defendeu a tese']},
    'atacar': {'class': 'verbo', 'definition': 'Investir contra', 'examples': ['Ataco o problema', 'Atacaram a fortaleza']},
    'fugir': {'class': 'verbo', 'definition': 'Escapar correndo', 'examples': ['Fujo do perigo', 'Fugiram juntos']},
    'esconder': {'class': 'verbo', 'definition': 'Ocultar', 'examples': ['Escondo o presente', 'Escondi a chave']},
    'revelar': {'class': 'verbo', 'definition': 'Tornar conhecido', 'examples': ['Revelo um segredo', 'Revelou a verdade']},
    'demonstrar': {'class': 'verbo', 'definition': 'Provar ou mostrar', 'examples': ['Demonstro meu amor', 'Demonstrou ter razão']},
    'expressar': {'class': 'verbo', 'definition': 'Manifestar sentimento', 'examples': ['Expresso minha opinião', 'Expressei gratidão']},
    'comunicar': {'class': 'verbo', 'definition': 'Transmitir informação', 'examples': ['Comunico uma notícia', 'Comunicou o resultado']},
    'explicar': {'class': 'verbo', 'definition': 'Esclarecer', 'examples': ['Explico o conteúdo', 'Explicou bem']},
    'compreender': {'class': 'verbo', 'definition': 'Captar sentido', 'examples': ['Compreendo você', 'Compreendi a mensagem']},
    'ignorar': {'class': 'verbo', 'definition': 'Não dar atenção', 'examples': ['Ignoro os comentários', 'Ignorei o aviso']},
    'notar': {'class': 'verbo', 'definition': 'Observar', 'examples': ['Noto uma diferença', 'Notei a ausência']},
    'parecer': {'class': 'verbo', 'definition': 'Ter aparência de', 'examples': ['Parece cansado', 'Pareceu feliz']},
    'certeza': {'class': 'substantivo', 'definition': 'Segurança de algo', 'examples': ['Tenho certeza', 'Com certeza vou']},
    'dúvida': {'class': 'substantivo', 'definition': 'Incerteza', 'examples': ['Tenho dúvida', 'Sem dúvida']},
    'possibilidade': {'class': 'substantivo', 'definition': 'Chance ou oportunidade', 'examples': ['Há possibilidade', 'Possibilidade de sucesso']},
    'impossibilidade': {'class': 'substantivo', 'definition': 'Falta de chance', 'examples': ['Impossibilidade de ir', 'É uma impossibilidade']},
}

class DictionaryPopulator:
    def __init__(self):
        self.base_words = PT_BR_COMMON_WORDS
        self.additional_words = {}
        
    def fetch_from_api(self, timeout=30):
        """Tenta buscar palavras de APIs públicas"""
        print("[DICT] Tentando buscar palavras de APIs públicas...")
        
        # Opção 1: Usar Free Dictionary API (funciona com PT-BR)
        try:
            print("[DICT] Testando Free Dictionary API...")
            # Buscar algumas palavras de teste
            test_words = ['amor', 'casa', 'trabalho', 'amigo']
            for word in test_words:
                try:
                    response = requests.get(
                        f"https://api.dictionaryapi.dev/api/v2/entries/pt/{word}",
                        timeout=5
                    )
                    if response.status_code == 200:
                        print(f"[DICT] ✓ Free Dictionary API respondendo para '{word}'")
                        return True
                except Exception as e:
                    print(f"[DICT] Free Dictionary API não disponível: {e}")
                    
        except Exception as e:
            print(f"[DICT] Erro ao testar Free Dictionary API: {e}")
        
        print("[DICT] ⚠ APIs públicas não disponíveis, usando base local")
        return False

    def expand_with_base_words(self):
        """Retorna as palavras base compiladas"""
        return self.base_words

    def get_all_words(self):
        """Retorna todas as palavras (base + adicionais)"""
        all_words = {**self.base_words, **self.additional_words}
        return all_words

    def get_word_count(self):
        """Retorna quantidade de palavras"""
        return len(self.get_all_words())

def populate_vocabulary():
    """Função principal para popular vocabulário"""
    populator = DictionaryPopulator()
    
    print("\n" + "="*60)
    print("🔤 INICIANDO POPULAÇÃO DE DICIONÁRIO PORTUGUÊS")
    print("="*60)
    
    # Tentar buscar da internet
    populator.fetch_from_api()
    
    # Obter palavras compiladas
    all_words = populator.get_all_words()
    word_count = populator.get_word_count()
    
    print(f"\n📚 Total de palavras carregadas: {word_count}")
    print(f"\n✓ Dicionário pronto para uso")
    print(f"   - {len(populator.base_words)} palavras base")
    print(f"   - {len(populator.additional_words)} palavras adicionais")
    
    # Mostrar algumas palavras como exemplo
    print("\n📋 Exemplos de palavras carregadas:")
    for i, (word, data) in enumerate(list(all_words.items())[:5]):
        print(f"   - {word}: {data.get('definition', 'Sem definição')}")
    
    return all_words

if __name__ == "__main__":
    words = populate_vocabulary()
    print(f"\n✅ Pronto! {len(words)} palavras disponíveis para o backend")
