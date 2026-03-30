-- Criar tabela de perfis
CREATE TABLE IF NOT EXISTS perfis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil_id INT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMP NULL,
    FOREIGN KEY (perfil_id) REFERENCES perfis(id) ON DELETE RESTRICT,
    INDEX idx_email (email),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de auditoria
CREATE TABLE IF NOT EXISTS auditoria (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    acao VARCHAR(100) NOT NULL,
    tabela VARCHAR(50),
    registro_id INT,
    detalhes JSON,
    ip_address VARCHAR(45),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_acao (acao),
    INDEX idx_data (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir perfis padrão
INSERT INTO perfis (nome, descricao) VALUES
('admin', 'Administrador - Acesso total ao sistema'),
('gerente', 'Gerente - Acesso a relatórios e controle de estoque'),
('operacional', 'Operacional - Acesso apenas a movimentações');

-- Inserir usuário admin padrão (senha: admin123)
INSERT INTO usuarios (nome, email, senha_hash, perfil_id) VALUES
('Administrador', 'admin@estoque.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUGyXlem', 1);

SELECT 'Tabelas de usuários criadas com sucesso!' AS status;
SHOW TABLES LIKE '%usuario%';
SHOW TABLES LIKE '%perfil%';
SHOW TABLES LIKE '%auditoria%';