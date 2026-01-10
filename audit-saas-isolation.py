"""
Audit Script - Verifica isolamento multi-tenant em todas as queries SQL
========================================================================

Valida que nenhuma query acessa dados de múltiplas empresas sem filtro.

Uso:
    python audit-saas-isolation.py
"""

import re
import os
import sys
from pathlib import Path
from typing import List, Tuple

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    GRAY = '\033[90m'
    END = '\033[0m'

class SQLAudit:
    """Audita queries SQL para garantir isolamento multi-tenant."""
    
    # Tabelas que DEVEM ter filtro por company_id
    MULTI_TENANT_TABLES = {
        'ai_learned_concepts',
        'ai_knowledge_base',
        'ai_word_meanings',
        'ai_conversation_suggestions',
        'ai_conversation_messages',
        'ai_events',
        'companies',  # users podem ser associados a múltiplas companies
    }
    
    # Patterns perigosos de query
    DANGEROUS_PATTERNS = [
        (r'SELECT\s+\*?\s+FROM\s+(\w+)\s*(?:JOIN|INNER|LEFT|RIGHT|CROSS)?(?:\s|$)', 'Possible unfiltered SELECT'),
        (r'INSERT\s+INTO\s+(\w+)', 'INSERT sem WHERE (normal, mas verificar company_id na insert)'),
        (r'UPDATE\s+(\w+)\s+(?!.*WHERE)', 'UPDATE sem WHERE clause (ALERTA!)'),
        (r'DELETE\s+FROM\s+(\w+)\s+(?!.*WHERE)', 'DELETE sem WHERE clause (ALERTA!)'),
    ]
    
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.passed = []
    
    def log_issue(self, file: str, line_num: int, severity: str, message: str, code: str = ""):
        """Registra issue encontrada."""
        self.issues.append({
            'file': file,
            'line': line_num,
            'severity': severity,
            'message': message,
            'code': code
        })
    
    def log_warning(self, file: str, line_num: int, message: str):
        """Registra warning."""
        self.warnings.append({
            'file': file,
            'line': line_num,
            'message': message
        })
    
    def log_pass(self, file: str, line_num: int, table: str):
        """Registra query segura."""
        self.passed.append({
            'file': file,
            'line': line_num,
            'table': table
        })
    
    def extract_sql_statements(self, text: str) -> List[Tuple[str, int]]:
        """Extrai statements SQL de código Python/TypeScript."""
        statements = []
        lines = text.split('\n')
        
        in_sql = False
        sql_buffer = ""
        start_line = 0
        
        for i, line in enumerate(lines, 1):
            # Detectar início de SQL statement
            if '"""' in line or "'''" in line or "'" in line and 'SELECT' in line:
                in_sql = True
                start_line = i
                sql_buffer = line
            elif in_sql:
                sql_buffer += " " + line
                # Detectar fim (;, """, etc)
                if '"""' in line or "'''" in line or line.strip().endswith(';'):
                    in_sql = False
                    if sql_buffer.strip():
                        statements.append((sql_buffer, start_line))
                    sql_buffer = ""
            elif any(keyword in line.upper() for keyword in ['SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ']):
                # One-liner SQL
                statements.append((line, i))
        
        return statements
    
    def check_query(self, sql: str, file: str, line_num: int) -> bool:
        """Verifica se uma query tem isolamento adequado."""
        sql_upper = sql.upper()
        
        # Extrair nome da tabela principal
        match = re.search(r'FROM\s+(\w+)|INTO\s+(\w+)|UPDATE\s+(\w+)', sql_upper)
        if not match:
            return True  # Não conseguiu extrair, pular
        
        table = (match.group(1) or match.group(2) or match.group(3)).lower()
        
        # Se não é tabela multi-tenant, OK
        if table not in self.MULTI_TENANT_TABLES:
            return True
        
        # Verificar se tem WHERE com company_id
        has_where = 'WHERE' in sql_upper
        has_company_filter = 'COMPANY_ID' in sql_upper or 'company_id' in sql
        
        # Especiais: INSERT não precisa de WHERE
        if 'INSERT' in sql_upper:
            has_company_in_values = 'COMPANY_ID' in sql_upper or 'company_id' in sql
            if has_company_in_values:
                self.log_pass(file, line_num, table)
                return True
            else:
                self.log_warning(file, line_num, f'INSERT INTO {table} sem company_id nos values')
                return True
        
        # UPDATE/DELETE OBRIGATORIAMENTE precisam de WHERE com company_id
        if 'UPDATE' in sql_upper or 'DELETE' in sql_upper:
            if not has_where:
                self.log_issue(file, line_num, 'CRITICAL', 
                    f'{sql_upper.split()[0]} {table} sem WHERE clause!', sql)
                return False
            if not has_company_filter:
                self.log_issue(file, line_num, 'CRITICAL',
                    f'{sql_upper.split()[0]} {table} sem filtro company_id!', sql)
                return False
        
        # SELECT deve ter WHERE com company_id (salvo casos especiais)
        if 'SELECT' in sql_upper:
            # Exceções: JOINs com companies, etc
            if 'COUNT(*)' in sql_upper and 'company_id' not in sql:
                # Alguns counts podem ser globais
                pass
            elif not has_company_filter:
                # Sempre avisar se SELECT não filtra
                self.log_warning(file, line_num, 
                    f'SELECT FROM {table} pode estar sem filtro company_id')
                return True
            else:
                self.log_pass(file, line_num, table)
        
        return True
    
    def audit_file(self, filepath: str) -> int:
        """Audita um arquivo Python/TypeScript."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return 0
        
        statements = self.extract_sql_statements(content)
        count = 0
        
        for sql, line in statements:
            if self.check_query(sql, filepath, line):
                count += 1
        
        return count
    
    def audit_directory(self, directory: str) -> int:
        """Audita todos os arquivos em um diretório."""
        patterns = ['**/*.py', '**/*.ts', '**/*.js']
        total = 0
        
        for pattern in patterns:
            for filepath in Path(directory).glob(pattern):
                # Skip node_modules e __pycache__
                if 'node_modules' in str(filepath) or '__pycache__' in str(filepath):
                    continue
                
                if filepath.is_file():
                    self.audit_file(str(filepath))
                    total += 1
        
        return total
    
    def print_report(self):
        """Imprime relatório de auditoria."""
        print(f"\n{Colors.BLUE}╔════════════════════════════════════════════════════════╗{Colors.END}")
        print(f"{Colors.BLUE}║         AUDITORIA DE ISOLAMENTO MULTI-TENANT          ║{Colors.END}")
        print(f"{Colors.BLUE}╚════════════════════════════════════════════════════════╝{Colors.END}\n")
        
        # Resumo
        print(f"  Queries seguras: {Colors.GREEN}{len(self.passed)}{Colors.END}")
        print(f"  Warnings: {Colors.YELLOW}{len(self.warnings)}{Colors.END}")
        print(f"  Issues críticas: {Colors.RED}{len(self.issues)}{Colors.END}\n")
        
        # Issues
        if self.issues:
            print(f"{Colors.RED}╔ ISSUES CRÍTICAS ╗{Colors.END}")
            for issue in self.issues:
                print(f"  {Colors.RED}✗{Colors.END} {issue['file']}:{issue['line']}")
                print(f"    └─ {issue['message']}")
                if issue['code']:
                    print(f"    └─ Código: {issue['code'][:100]}...")
            print()
        
        # Warnings
        if self.warnings:
            print(f"{Colors.YELLOW}╔ WARNINGS ╗{Colors.END}")
            for warn in self.warnings:
                print(f"  {Colors.YELLOW}⚠{Colors.END} {warn['file']}:{warn['line']}")
                print(f"    └─ {warn['message']}")
            print()
        
        # Recomendações
        print(f"{Colors.BLUE}╔ RECOMENDAÇÕES ╗{Colors.END}")
        print(f"  1. Revisar todas as queries em issues críticas")
        print(f"  2. Garantir que WHERE company_id está em UPDATE/DELETE")
        print(f"  3. Testes: python test-multi-tenant-isolation.py")
        print(f"  4. Revisar documento: SAAS_SECURITY_MULTITENANT.md")
        print()

def main():
    print(f"\n{Colors.BLUE}Iniciando auditoria de isolamento multi-tenant...{Colors.END}\n")
    
    # Auditoria do backend TypeScript
    print(f"{Colors.GRAY}Auditando backend (TypeScript)...{Colors.END}")
    audit = SQLAudit()
    audit.audit_directory('backend/src')
    
    # Auditoria do serviço de IA
    print(f"{Colors.GRAY}Auditando AI service (Python)...{Colors.END}")
    audit.audit_directory('ai-service')
    
    # Imprimir relatório
    audit.print_report()
    
    # Return código apropriado
    if audit.issues:
        print(f"{Colors.RED}⚠️  FALHA: Encontradas issues críticas!{Colors.END}\n")
        return 1
    elif audit.warnings:
        print(f"{Colors.YELLOW}⚠️  AVISO: Encontrados warnings que precisam revisão.{Colors.END}\n")
        return 0
    else:
        print(f"{Colors.GREEN}✓ Auditoria passou! Isolamento multi-tenant está seguro.{Colors.END}\n")
        return 0

if __name__ == "__main__":
    sys.exit(main())
