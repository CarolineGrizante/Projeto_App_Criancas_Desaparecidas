# Desenvolvimento de Aplicativo de Apoio ao Registro e à Localização de Crianças Desaparecidas

## Integrantes do grupo

- **Caroline da Silva Grizante** — RA: 114105
- **Emilly Emanuelly R. dos Santos** — RA: 114095
- **Marcela Lovatto** — RA: 113626

## Sobre o trabalho

Protótipo de uma aplicação mobile voltada ao apoio na busca imediata por crianças desaparecidas. O projeto foi desenvolvido como uma simulação acadêmica de interface e fluxo de navegação para apresentação em sala de aula e publicação no GitHub.

> **Aviso:** este projeto é exclusivamente demonstrativo. Os dados apresentados são fictícios e nenhum registro real deve ser criado ou compartilhado por meio desta versão.

## Sobre o projeto

A proposta do aplicativo é aproximar familiares, cidadãos colaboradores e instituições em uma rede de informação responsável. A interface prioriza a comunicação rápida de emergências, a validação por Boletim de Ocorrência e o encaminhamento de pistas aos canais oficiais.

O protótipo utiliza um simulador de smartphone centralizado na página, permitindo que o professor ou avaliador navegue pelas telas sem precisar instalar um aplicativo mobile.

## Objetivos

- Demonstrar o fluxo de um aplicativo de busca imediata.
- Organizar as informações de crianças desaparecidas em cards de fácil leitura.
- Destacar os canais oficiais de emergência, como 190 e 181.
- Mostrar a importância da validação por Boletim de Ocorrência.
- Simular o uso de recursos nativos, como GPS, câmera e sensores.
- Apresentar uma interface mobile com navegação simples e visual consistente.

## Funcionalidades demonstradas

### 1. Home e emergência

A tela inicial apresenta:

- Alerta de emergência com orientação para não esperar 24 horas.
- Acesso rápido para ligação ao 190.
- Acesso ao canal de pistas 181.
- Atalho para registrar um novo caso.
- Atalho para buscar crianças desaparecidas.
- Lista de alertas ativos da região.

### 2. Login e autenticação

A tela de autenticação simula:

- Entrada por e-mail ou CPF.
- Campo de senha.
- Opção para lembrar o dispositivo.
- Aceite dos termos de uso e política de privacidade.
- Acesso à tela de criação de conta.

### 3. Criação de conta

A tela de cadastro apresenta campos para:

- Nome completo.
- CPF.
- Telefone.
- Tipo de vínculo com a plataforma.
- Aceite dos termos de uso.

Os tipos de vínculo disponíveis são:

- Familiar.
- Cidadão colaborador.
- Representante institucional.

### 4. Registro de desaparecimento

A tela de cadastro de caso foi dividida em etapas didáticas:

- Dados básicos da criança.
- Idade.
- Último local visto.
- Características físicas e roupas usadas.
- Número do Boletim de Ocorrência.
- Delegacia responsável.
- Simulação de marcação por GPS.
- Simulação de adição de foto.
- Autorização de uso da imagem.

### 5. Lista de casos

A tela de busca permite consultar casos simulados por:

- Nome.
- Cidade.
- Bairro.
- Número do Boletim de Ocorrência.

Cada registro apresenta:

- Iniciais da criança.
- Nome e idade.
- Cidade e bairro.
- Horário ou data do desaparecimento.
- Indicador de B.O. validado.
- Detalhes completos do caso.

### 6. Detalhes do caso

Ao selecionar um caso, é aberto um painel com:

- Nome e idade.
- Local aproximado.
- Data do desaparecimento.
- Número do B.O.
- Características informadas.
- Última localização conhecida.
- Botão para encaminhar uma pista.
- Botão para ligar para o Disque-Denúncia 181.

### 7. Perfil do usuário

A tela de perfil apresenta uma simulação de:

- Dados do usuário.
- E-mail e telefone.
- Quantidade de B.O.s cadastrados.
- Permissão de localização.
- Permissão de câmera.
- Permissão de notificações.
- Encerramento da sessão.

### 8. Laboratório de sensores

O laboratório simula recursos nativos do smartphone:

- Acelerômetro.
- Eixos X, Y e Z.
- Valores atualizados em tempo real.
- Gráfico de movimento.
- Botão para pausar a leitura.
- Explicação didática sobre os sensores.

Os valores do laboratório são gerados pelo JavaScript e não representam uma leitura real do hardware do computador.

## Interface visual

A identidade visual foi inspirada em uma interface mobile moderna, com:

- Simulador de celular centralizado.
- Moldura de smartphone.
- Dynamic Island simulada.
- Tema escuro em azul-marinho.
- Cor vermelha para situações de emergência.
- Elementos perolados em bege claro.
- Cards com efeito glassmorphism.
- Navegação inferior inspirada em aplicativos mobile.
- Alternância entre tema escuro e tema claro.
- Layout responsivo para telas menores.

## Tecnologias utilizadas

- HTML5.
- CSS3.
- JavaScript puro.
- CSS Grid e Flexbox.
- HTML Canvas para o gráfico dos sensores.
- Google Fonts para tipografia.
- Design responsivo.
- Git e GitHub para versionamento.

Não é necessário utilizar React, Vue, Angular, Node.js ou banco de dados para executar esta versão do protótipo.

## Estrutura do projeto

```text
criancas-desaparecidas/
│
├── index.html
├── README.md
├── LEIA-ME.txt
│
├── css/
│   └── styles.css
│
└── js/
    └── app.js
```

### `index.html`

Arquivo principal da aplicação. Contém:

- Estrutura do simulador de celular.
- Barra superior do projeto.
- Seletor de telas.
- Botões de controle.
- Área onde o JavaScript renderiza cada tela.
- Navegação inferior do aplicativo.

### `css/styles.css`

Arquivo responsável pelo visual da aplicação:

- Cores.
- Tipografia.
- Cards.
- Botões.
- Formulários.
- Simulador de smartphone.
- Tema claro e escuro.
- Responsividade.
- Animações.

### `js/app.js`

Arquivo responsável pela interação:

- Troca de telas.
- Navegação inferior.
- Seletor de telas.
- Login simulado.
- Cadastro simulado.
- Registro de caso.
- Filtro de casos.
- Abertura dos detalhes.
- Mensagens de alerta.
- Alternância de tema.
- Gráfico de sensores.

## Limitações atuais

Esta versão é um protótipo de interface. Portanto:

- Não possui banco de dados.
- Não realiza autenticação real.
- Não envia registros para autoridades.
- Não valida B.O.s em sistemas oficiais.
- Não acessa o GPS real.
- Não acessa a câmera real.
- Não coleta dados pessoais.
- Não possui notificações reais.
- O gráfico de sensores utiliza valores simulados.
- Os links 190 e 181 dependem do dispositivo e do navegador utilizados.

## Possíveis melhorias futuras

- Criar uma API para armazenar os casos.
- Adicionar autenticação com níveis de acesso.
- Integrar mapa real com localização aproximada.
- Integrar câmera e upload de imagens.
- Integrar sensores reais em uma aplicação mobile.
- Criar painel para instituições autorizadas.
- Adicionar histórico de alterações dos casos.
- Implementar criptografia e controle de permissões.
- Integrar notificações push.
- Criar testes automatizados.
- Adicionar suporte a leitores de tela e recursos avançados de acessibilidade.

## Segurança e privacidade

Uma aplicação real para desaparecimento de crianças deve tratar dados pessoais e imagens de menores com extremo cuidado. Antes de uma implementação real, seria necessário considerar:

- Lei Geral de Proteção de Dados — LGPD.
- Controle de acesso por perfil.
- Registro de auditoria.
- Consentimento dos responsáveis.
- Criptografia dos dados.
- Armazenamento seguro de imagens.
- Validação com autoridades competentes.
- Política de retenção e exclusão de dados.
- Proteção contra trotes e denúncias falsas.
- Não exposição de localização exata publicamente.

## Autoria

Projeto acadêmico desenvolvido para fins de estudo e apresentação na área de Engenharia da Computação.

## Licença

Este projeto pode ser utilizado para fins educacionais, apresentações e estudos. Caso o projeto seja utilizado como base para uma aplicação real, recomenda-se revisar completamente a arquitetura, a segurança, a privacidade e os requisitos legais antes da publicação.
