# Menu Principal - Controle de Manutenção (Protótipo PWA)

Este é um protótipo interativo de um menu principal para uma aplicação de controle de manutenção, desenvolvido com HTML, CSS e JavaScript puro. Ele foi projetado para ser moderno, atraente e intuitivo, e agora inclui a base para um Progressive Web App (PWA) e a funcionalidade de Cadastro de Equipamentos.

## Funcionalidades Implementadas

*   **Design Moderno e Responsivo:** Utiliza gradientes, efeitos de *glassmorphism* e tipografia limpa. O layout se adapta a diferentes tamanhos de tela (desktop, tablet, mobile).
*   **Interatividade Aprimorada:**
    *   Efeitos de *hover* nos botões (elevação, mudança de cor, rotação de ícones).
    *   Animações de entrada sequenciais para os itens do menu.
    *   Efeito *ripple* ao clicar nos botões, proporcionando feedback visual.
*   **Ícones Intuitivos:** Cada opção de menu possui um ícone relevante para facilitar o reconhecimento rápido da função.
*   **Funcionalidade "Sair" Aprimorada:** O botão "Sair" possui uma cor vermelha distintiva e, ao ser clicado e confirmado, redireciona para uma página em branco (`about:blank`), simulando o encerramento da aplicação.
*   **Funcionalidade de Cadastro de Equipamentos:**
    *   **Tela de Listagem:** Ao clicar em "Cadastro de Equipamentos" no menu principal, uma nova tela é exibida com uma tabela de equipamentos (dados de exemplo).
        *   Campos exibidos: Nome do Equipamento, Descrição, Setor, Etiqueta, Última Manutenção, Chamado, Próxima Manutenção.
        *   Botões: "Novo Cadastro" e "Sair" (retorna ao menu principal).
    *   **Tela de Novo Cadastro:** Ao clicar em "Novo Cadastro", um formulário é apresentado para inserir novos equipamentos.
        *   Campos: Nome do Equipamento, Descrição do Equipamento, Setor (dropdown), Etiqueta.
        *   Botões: "Salvar" (adiciona o equipamento à tabela e retorna à tela de listagem) e "Cancelar" (retorna à tela de listagem sem salvar).
*   **Base para PWA (Progressive Web App):**
    *   Inclusão de `manifest.json` para metadados do aplicativo (nome, ícones, cores).
    *   Criação de `service-worker.js` para cache de recursos e funcionalidade offline básica.
    *   Registro do Service Worker no `index.html`.

## Como Testar

1.  **Baixe os arquivos:** Certifique-se de ter todos os arquivos (`index.html`, `style.css`, `manifest.json`, `service-worker.js`, e a pasta `icons` com `icon-192x192.png`, `icon-512x512.png`).
2.  **Inicie um servidor web local:** Devido às restrições de segurança dos navegadores para Service Workers, você precisará servir os arquivos através de um servidor HTTP. Uma maneira simples é usar Python:
    ```bash
    python3.11 -m http.server 8000
    ```
    Execute este comando no diretório onde seus arquivos estão localizados.
3.  **Acesse no navegador:** Abra seu navegador e navegue para `http://localhost:8000`.
4.  **Interaja com o menu:**
    *   Clique em "Cadastro de Equipamentos" para ir para a tela de listagem.
    *   Na tela de listagem, clique em "Novo Cadastro" para abrir o formulário.
    *   Preencha o formulário e clique em "Salvar" para adicionar um novo equipamento à tabela e retornar à listagem.
    *   Clique em "Cancelar" para retornar à listagem sem salvar.
    *   Clique em "Sair" na tela de listagem para voltar ao menu principal.
    *   No menu principal, clique em "Sair" e confirme para ser redirecionado para uma página em branco.
5.  **Instale como PWA (opcional):** No Chrome (e outros navegadores compatíveis), você verá um ícone de "instalar" na barra de endereço. Clique nele para adicionar a aplicação à sua tela inicial ou desktop.

## Estrutura do Projeto

```
. 
├── index.html         # Estrutura principal da aplicação e lógica JavaScript
├── style.css          # Estilos CSS para o design e layout
├── manifest.json      # Metadados do PWA
├── service-worker.js  # Lógica do Service Worker para PWA (cache, offline)
├── README.md          # Este arquivo
└── icons/
    ├── icon-192x192.png
    └── icon-512x512.png
```

## Próximos Passos (Sugestões)

*   **Integração com Firestore:** Conectar o formulário de cadastro e a listagem de equipamentos ao seu banco de dados Firestore para persistência real dos dados.
*   **Validação de Formulário:** Adicionar validações mais robustas aos campos do formulário.
*   **Edição/Exclusão de Equipamentos:** Implementar funcionalidades para editar e excluir equipamentos da lista.
*   **Funcionalidades de Outros Botões:** Desenvolver as telas e lógicas para "Agenda de Manutenção", "Manutenções Pendentes", "Manutenções Realizadas" e "Relatórios".
*   **Notificações Push:** Implementar notificações push via Service Worker e Firebase Cloud Messaging.
*   **Autenticação:** Adicionar sistema de login/logout com Firebase Authentication.

Espero que este protótipo sirva como uma base sólida para o desenvolvimento da sua aplicação de controle de manutenção!
