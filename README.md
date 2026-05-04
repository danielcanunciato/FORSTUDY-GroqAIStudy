### Projeto para fins de estudo
Pode utilizar caso queira observar o que pude criar com meu favorito ReactJS+Vite e MySQL.
No App.jsx foi sim um código construído por conta própria, eu pedi uma mãozinha pra IA pra dar uns reajustes para otimizar e lagar menos o front-end.

**Estudos em conta:**
 - Aprofundamento na conexão da API com o Frontend
 - Estruturas de dados em MySQL
 - Criptografia de dados de login
 - JWT na prática para Login e login automático
 - Cadastro de usuário
 - bcrypt e aprofundamento em JWT
 - Geração de prompt de IA pelo modelo do GPT

---

**Para fazer o código rodar em sua máquina:**
-  Criar uma conexão de banco dentro do MySQL
-  Atualizar db.js com as informações da sua conexão dentro do MySQL

---

-> Criar duas tabelas com as seguintes informações (pode nomear o que você quiser, mas são as informações de tabela que usei no projeto):
#### TABLE DE USUÁRIOS
- **NOME DA TABELA: _bd_users_**
    - **DADOS:**
        - **id**           INT PRIMARY KEY AUTO_INCREMENT
        - **username**     VARCHAR(100)
        - **password**     VARCHAR(100)
        - **role**         VARCHAR(20)

#### TABLE DE PROMPTS
- **NOME DA TABELA: _bd_prompts_**
    - DADOS:
        - **prompt_id**    INT PRIMARY KEY AUTO_INCREMENT
        - **prompt**       LONGTEXT
        - **reply**        LONGTEXT
        - **userID**       INT (* (CHAVE ESTRANGEIRA, NO MYSQL TEM QUE DEFINIR DEPOIS))
        - **promptDate**   DATETIME

**: Para definir a Foreign Key 'userid': FOREIGN KEY (userID) REFERENCES bd_users (id)*