$tests = @(
    @{msg="Como está?"; expected="ask_status"},
    @{msg="Qual é o horário?"; expected="ask_time"},
    @{msg="Qual horário?"; expected="ask_time"},
    @{msg="Onde fica?"; expected="ask_location"},
    @{msg="Qual o preço?"; expected="ask_pricing"},
    @{msg="Qual preço?"; expected="ask_pricing"},
    @{msg="Como pagar?"; expected="ask_how_to"},
    @{msg="Como faço para agendar?"; expected="ask_how_to"}
)

Write-Host ""
Write-Host "========== TESTE DE COMPREENSAO DE FRASES SIMPLES ==========" -ForegroundColor Cyan
Write-Host ""

foreach($test in $tests) {
    $payload = @{
        incoming_message = $test.msg
        context_summary = ""
        company_id = "99999999-9999-9999-9999-999999999999"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5001/cognitive-response" -Method POST -Body $payload -ContentType "application/json; charset=utf-8" -UseBasicParsing -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        
        $result = if($data.detected_intent -eq $test.expected) { "OK" } else { "FAIL" }
        
        if($data.detected_intent -eq $test.expected) {
            Write-Host "OK Mensagem: '$($test.msg)'" -ForegroundColor Green
        } else {
            Write-Host "FAIL Mensagem: '$($test.msg)'" -ForegroundColor Red
        }
        Write-Host "   Intent Detectada: $($data.detected_intent) (esperado: $($test.expected))" -ForegroundColor Yellow
        Write-Host "   Confianca: $($data.intent_confidence)" -ForegroundColor Gray
        Write-Host ""
    }
    catch {
        Write-Host "ERRO ao testar '$($test.msg)': $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
