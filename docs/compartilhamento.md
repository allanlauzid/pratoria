# Compartilhamento

Especificação completa (layout do arquivo, pacotes, segurança): `docs/proposta-arquivo-ux-design.md`.

## Regras (decisões do Allan)
- **Um único arquivo `nome.pratoria`.** Por dentro é um zip (fflate); o app reconhece pelo conteúdo, não pela extensão.
- **Pacotes:**
  - **Só texto:** `receita.md`.
  - **Texto + imagens:** `receita.md` + `imagens/prato.webp` + `imagens/ilustracoes.webp`.
  - **Opção "imagens dentro do texto":** o base64 vai dentro do `receita.md`, que então funciona sozinho.
- **O `receita.md` sempre leva:**
  - envelope (quem compartilhou, quando o arquivo foi gerado, histórico de quem passou adiante);
  - receita com impressão digital;
  - índice das imagens (com sha256) e os 3 prompts;
  - link original ou `[sem link original]`.
- **Nunca texto da receita colado solto.** Cartão-imagem, copiar/colar e SMS foram removidos.
- **Link e QR:**
  - sem conta, levam o `receita.md` compactado, sem anexos e sem prompts. A piloto dá cerca de 3.600 caracteres, ou 6 QRs.
  - com conta (futuro), apontam para o `.pratoria` no Supabase.
- **Imagens recebidas:** sempre passam por revisão (Usar / Gerar de novo / Sem imagem), com aviso de imagem danificada.

## Modalidades
| Modalidade | Só texto | Texto + imagens |
|---|---|---|
| Enviar pelo celular (AirDrop, Quick Share, Bluetooth, Drive) | ✔ | ✔ |
| WhatsApp / Telegram / Signal (documento) | ✔ | ✔ |
| E-mail com anexo | ✔ | ✔ |
| Baixar arquivo | ✔ | ✔ |
| Imprimir / PDF (legível; arquivo embutido no PDF: futuro) | ✔ | ✔ |
| Link com a receita | ✔ | com conta |
| QR code na tela | ✔ | com conta |
| Contatos, link público | com conta | com conta |
| P2P por Wi-Fi | futuro | futuro |

Onde o menu nativo não aceitar um `.pratoria` (provável no Chrome do Android), o app baixa o arquivo e avisa para enviar como anexo.

## Não viáveis pelo navegador
- Bluetooth direto entre celulares.
- NFC entre celulares.
- Wi-Fi Direct.
