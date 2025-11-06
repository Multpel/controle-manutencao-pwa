/**
 * app.js - Controle de Manutenção PWA
 * JavaScript completo com todas as funcionalidades
 */

// ========================================
// DADOS SIMULADOS
// ========================================

// Firebase v8 - Carregue os scripts pelo CDN antes deste arquivo no HTML
var firebaseConfig = {
  apiKey: "AIzaSyDc4KaKwPYxJUiduqH1WzsHfWx4YEbS6aU",
  authDomain: "multpels-projects-vercel.firebaseapp.com",
  projectId: "multpels-projects-vercel",
  storageBucket: "multpels-projects-vercel.firebasestorage.app",
  messagingSenderId: "1038398020775",
  appId: "1:1038398020775:web:8e91a45634d8b3e36a0f82",
  measurementId: "G-D7XZM43V29"
};

// Inicialize o Firebase v8
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
var analytics = firebase.analytics();


let equipamentos = [
    { 
        id: 1, 
        nome: 'Servidor Principal', 
        etiqueta: 'SRV-001', 
        setor: 'TI', 
        ultimaManutencao: '2025-09-10', 
        proximaManutencao: '2025-12-10',
        descricao: 'Servidor de aplicações'
    },
    { 
        id: 2, 
        nome: 'Ar Condicionado Central', 
        etiqueta: 'AC-002', 
        setor: 'Infraestrutura', 
        ultimaManutencao: '2025-08-15', 
        proximaManutencao: '2025-11-15',
        descricao: 'Sistema de climatização'
    },
    { 
        id: 3, 
        nome: 'Gerador de Emergência', 
        etiqueta: 'GER-003', 
        setor: 'Elétrica', 
        ultimaManutencao: '2025-09-01', 
        proximaManutencao: '2025-12-01',
        descricao: 'Gerador diesel 500kVA'
    }
];

let manutencoesRealizadas = [];
let nextEquipamentoId = 4;

// ========================================
// INICIALIZAÇÃO E EVENT LISTENERS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✓ App.js inicializado');
    
    // Event listener para os botões do menu principal
    const menuItems = document.querySelectorAll('.menu-item');
    console.log(`✓ ${menuItems.length} menu items encontrados`);
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetScreen = this.getAttribute('data-target-screen');
            console.log('Menu item clicado:', targetScreen);
            
            if (targetScreen) {
                navigateToScreen(targetScreen);
            } else {
                // É o botão "Sair"
                exitApp();
            }
        });
    });
    
    // Event listener para formulário de equipamentos
    const equipamentoForm = document.getElementById('equipamentoForm');
    if (equipamentoForm) {
        equipamentoForm.addEventListener('submit', submitEquipamentoForm);
    }
    
    // Botões "Voltar" e "Novo Cadastro"
    const backBtns = document.querySelectorAll('.btn-back');
    backBtns.forEach(btn => {
        btn.addEventListener('click', backToMenu);
    });
    
    const newCadastroBtns = document.querySelectorAll('[onclick="openCadastroForm()"]');
    newCadastroBtns.forEach(btn => {
        btn.addEventListener('click', openCadastroForm);
    });
    
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('✓ Service Worker registrado'))
            .catch(err => console.error('✗ Erro ao registrar Service Worker:', err));
    }
});

// ========================================
// FUNÇÕES DE NAVEGAÇÃO
// ========================================

function showScreen(screenId, modo) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.style.display = 'none');

    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'none';

    if (screenId === 'main-menu') {
        if (mainMenu) mainMenu.style.display = 'block';
        console.log('Menu principal exibido');
    } else {
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.style.display = 'block';
            // Resetar form no modo "novo"
            if (screenId === 'cadastro-equipamento-screen' && modo === 'novo') {
                const form = document.getElementById('equipamento-form');
                if (form) form.reset();
                if (form) form.dataset.mode = "add";
                if (form) form.dataset.editId = "";
            }
        }
    }
}



function navigateToScreen(screenId) {
    console.log('→ Navegando para:', screenId);
    showScreen(screenId);
    
    // Carregar dados específicos da tela
    setTimeout(() => {
        if (screenId === 'equipamentos-screen') {
            carregarEquipamentosDoFirestore();
        } else if (screenId === 'agenda-screen') {
            loadAgenda();
        } else if (screenId === 'pendentes-screen') {
            loadPendentes();
        } else if (screenId === 'realizadas-screen') {
            loadRealizadas();
		} else if (screenId === 'relatorios-screen') {
            loadRelatorios();  // ← ADICIONAR ESTA LINHA	
        }
    }, 100);
}

function backToMenu() {
    console.log('← Voltando ao menu');
    showScreen('main-menu');
}

function exitApp() {
    if (confirm('Deseja realmente sair da aplicação?')) {
        window.location.href = 'about:blank';
    }
}

// ========================================
// CADASTRO DE EQUIPAMENTOS
// ========================================

function loadEquipamentos() {
    console.log('Carregando equipamentos...');
    const tbody = document.querySelector('#equipamentos-screen tbody');
    if (!tbody) {
        console.error('tbody não encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (equipamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">Nenhum equipamento cadastrado</td></tr>';
        return;
    }
    
    equipamentos.forEach(eq => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${eq.nome}</td>
            <td>${eq.etiqueta}</td>
            <td>${eq.setor}</td>
            <td>${eq.ultimaManutencao || '-'}</td>
            <td>${eq.proximaManutencao || '-'}</td>
            <td>
                <button class="btn-acao" onclick="editEquipamento(${eq.id})">Editar</button>
                <button class="btn-acao btn-delete" onclick="deleteEquipamento(${eq.id})">Deletar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✓ ${equipamentos.length} equipamentos carregados`);
}

function openCadastroForm() {
    console.log('Abrindo formulário de cadastro');
    showScreen('cadastro-form');
    const form = document.getElementById('equipamentoForm');
    if (form) {
        form.reset();
        form.dataset.mode = 'add';
        delete form.dataset.editId;
    }
}

function submitEquipamentoForm(event) {
    event.preventDefault();
    console.log('Enviando formulário');
    
    const form = event.target;
    const nome = document.getElementById('nome').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const setor = document.getElementById('setor').value;
    const etiqueta = document.getElementById('etiqueta').value.trim();
    
    // Validação
    if (!nome || !descricao || !setor || !etiqueta) {
        alert('Por favor, preencha todos os campos obrigatórios!');
        return;
    }
    
    const mode = form.dataset.mode || 'add';
    
    if (mode === 'edit') {
        const editId = parseInt(form.dataset.editId);
        const equipamento = equipamentos.find(e => e.id === editId);
        if (equipamento) {
            equipamento.nome = nome;
            equipamento.descricao = descricao;
            equipamento.setor = setor;
            equipamento.etiqueta = etiqueta;
            alert('Equipamento atualizado com sucesso!');
        }
    } else {
        const novoEquipamento = {
            id: nextEquipamentoId++,
            nome: nome,
            descricao: descricao,
            setor: setor,
            etiqueta: etiqueta,
            ultimaManutencao: '',
            proximaManutencao: ''
        };
        salvarEquipamentoNoFirestore(novoEquipamento);

    }
    
    navigateToScreen('equipamentos-screen');
}

async function salvarEquipamentoNoFirestore(equipamento) {
    try {
        await setDoc(doc(collection(db, "cadastro"), equipamento.etiqueta), equipamento);
        alert('Equipamento cadastrado com sucesso!');
        carregarEquipamentosDoFirestore(); // Atualiza a lista na tela
    } catch (error) {
        console.error("✗ Erro ao cadastrar equipamento:", error);
        alert('Erro ao cadastrar equipamento.');
    }
}
async function carregarEquipamentosDoFirestore() {
    const snapshot = await getDocs(collection(db, "cadastro"));
    equipamentos = [];
    snapshot.forEach(doc => {
        equipamentos.push(doc.data());
    });
    loadEquipamentos();
}

function editEquipamento(id) {
    console.log('Editando equipamento:', id);
    const equipamento = equipamentos.find(e => e.id === id);
    if (!equipamento) return;
    
    showScreen('cadastro-form');
    
    document.getElementById('nome').value = equipamento.nome;
    document.getElementById('descricao').value = equipamento.descricao || '';
    document.getElementById('setor').value = equipamento.setor;
    document.getElementById('etiqueta').value = equipamento.etiqueta;
    
    const form = document.getElementById('equipamentoForm');
    form.dataset.mode = 'edit';
    form.dataset.editId = id;
}

function deleteEquipamento(id) {
    if (confirm('Deseja realmente deletar este equipamento?')) {
        console.log('Deletando equipamento:', id);
        equipamentos = equipamentos.filter(e => e.id !== id);
        loadEquipamentos();
        alert('Equipamento deletado com sucesso!');
    }
}

// ========================================
// AGENDA DE MANUTENÇÃO
// ========================================

function loadAgenda() {
    console.log('Carregando agenda...');
    const tbody = document.querySelector('#agenda-screen tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const agendados = equipamentos.filter(eq => eq.proximaManutencao);
    
    if (agendados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">Nenhuma manutenção agendada</td></tr>';
        return;
    }
    
    agendados.forEach(eq => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${eq.nome}</td>
            <td>${eq.etiqueta}</td>
            <td>${eq.setor}</td>
            <td>${eq.proximaManutencao}</td>
            <td>
                <button class="btn-acao" onclick="agendarManutencao(${eq.id})">Agendar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✓ ${agendados.length} manutenções agendadas`);
}

function agendarManutencao(id) {
    const equipamento = equipamentos.find(e => e.id === id);
    if (!equipamento) return;
    
    const novaData = prompt('Digite a nova data da manutenção (YYYY-MM-DD):', equipamento.proximaManutencao);
    if (novaData) {
        equipamento.proximaManutencao = novaData;
        loadAgenda();
        alert('Manutenção reagendada com sucesso!');
    }
}

// ========================================
// MANUTENÇÕES PENDENTES
// ========================================

function loadPendentes() {
    console.log('Carregando manutenções pendentes...');
    const tbody = document.querySelector('#pendentes-screen tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const hoje = new Date().toISOString().split('T')[0];
    const pendentes = equipamentos.filter(eq => {
        return eq.proximaManutencao && eq.proximaManutencao <= hoje;
    });
    
    if (pendentes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">Nenhuma manutenção pendente no momento</td></tr>';
        return;
    }
    
    pendentes.forEach((eq, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Pendente</td>
            <td>${eq.nome}</td>
            <td>${eq.etiqueta}</td>
            <td>${eq.setor}</td>
            <td>${eq.proximaManutencao}</td>
            <td>
                <button class="btn-acao" onclick="completarManutencao(${eq.id})">Completar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✓ ${pendentes.length} manutenções pendentes`);
}

function completarManutencao(id) {
    const equipamento = equipamentos.find(e => e.id === id);
    if (!equipamento) return;
    
    const dataRealizacao = prompt('Data da realização (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!dataRealizacao) return;
    
    const chamado = prompt('Número do chamado (opcional):') || 'N/A';
    const observacoes = prompt('Observações (opcional):') || '';
    
    const proximaData = new Date(dataRealizacao);
    proximaData.setDate(proximaData.getDate() + 60);
    const proximoAgendamento = proximaData.toISOString().split('T')[0];
    
    manutencoesRealizadas.push({
        id: Date.now(),
        nome: equipamento.nome,
        etiqueta: equipamento.etiqueta,
        realizacao: dataRealizacao,
        chamado: chamado,
        proximoAgend: proximoAgendamento,
        observacoes: observacoes
    });
    
    equipamento.ultimaManutencao = dataRealizacao;
    equipamento.proximaManutencao = proximoAgendamento;
    
    alert('Manutenção registrada com sucesso!');
    loadPendentes();
}

// ========================================
// MANUTENÇÕES REALIZADAS
// ========================================

function loadRealizadas() {
    console.log('Carregando manutenções realizadas...');
    const tbody = document.querySelector('#realizadas-screen tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (manutencoesRealizadas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">Nenhuma manutenção realizada ainda</td></tr>';
        return;
    }
    
    manutencoesRealizadas.forEach(manu => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${manu.nome}</td>
            <td>${manu.etiqueta}</td>
            <td>${manu.realizacao}</td>
            <td>${manu.chamado}</td>
            <td>${manu.proximoAgend}</td>
            <td>${manu.observacoes || '-'}</td>
        `;
        tbody.appendChild(row);
    });
// ========================================
// FUNÇÕES DE RELATÓRIOS
// ========================================

function loadRelatorios() {
    console.log('Carregando relatórios...');
    
    // Atualizar estatísticas gerais
    atualizarEstatisticas();
    
    // Gerar relatório por setor
    gerarRelatorioSetores();
    
    // Gerar lista de atrasados
    gerarListaAtrasados();
}

function atualizarEstatisticas() {
    // Total de equipamentos
    document.getElementById('total-equipamentos').textContent = equipamentos.length;
    
    // Total de manutenções realizadas
    document.getElementById('total-realizadas').textContent = manutencoesRealizadas.length;
    
    // Total de manutenções pendentes
    const hoje = new Date().toISOString().split('T')[0];
    const pendentes = equipamentos.filter(eq => {
        return eq.proximaManutencao && eq.proximaManutencao <= hoje;
    });
    document.getElementById('total-pendentes').textContent = pendentes.length;
    
    // Total de manutenções agendadas (futuras)
    const agendadas = equipamentos.filter(eq => {
        return eq.proximaManutencao && eq.proximaManutencao > hoje;
    });
    document.getElementById('total-agendadas').textContent = agendadas.length;
}

function gerarRelatorioSetores() {
    const tbody = document.getElementById('relatorio-setores-tbody');
    if (!tbody) return;
    
    // Agrupar por setor
    const setores = {};
    
    equipamentos.forEach(eq => {
        const setor = eq.setor || 'Sem Setor';
        if (!setores[setor]) {
            setores[setor] = {
                equipamentos: 0,
                realizadas: 0,
                pendentes: 0,
                agendadas: 0
            };
        }
        setores[setor].equipamentos++;
        
        // Contar pendentes
        const hoje = new Date().toISOString().split('T')[0];
        if (eq.proximaManutencao && eq.proximaManutencao <= hoje) {
            setores[setor].pendentes++;
        }
        
        // Contar agendadas
        if (eq.proximaManutencao && eq.proximaManutencao > hoje) {
            setores[setor].agendadas++;
        }
    });
    
    // Contar realizadas por setor
    manutencoesRealizadas.forEach(manu => {
        const equipamento = equipamentos.find(eq => eq.etiqueta === manu.etiqueta);
        if (equipamento) {
            const setor = equipamento.setor || 'Sem Setor';
            if (setores[setor]) {
                setores[setor].realizadas++;
            }
        }
    });
    
    // Limpar tbody
    tbody.innerHTML = '';
    
    // Gerar linhas
    if (Object.keys(setores).length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">Nenhum dado disponível</td></tr>';
        return;
    }
    
    Object.keys(setores).forEach(setor => {
        const dados = setores[setor];
        const total = dados.realizadas + dados.pendentes;
        const taxa = total > 0 ? Math.round((dados.realizadas / total) * 100) : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${setor}</strong></td>
            <td>${dados.equipamentos}</td>
            <td>${dados.realizadas}</td>
            <td>${dados.pendentes}</td>
            <td>${dados.agendadas}</td>
            <td>
                <span class="status-badge ${taxa >= 80 ? 'badge-success' : taxa >= 50 ? 'badge-warning' : 'badge-danger'}">
                    ${taxa}%
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function gerarListaAtrasados() {
    const tbody = document.getElementById('relatorio-atrasados-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const hoje = new Date();
    const atrasados = [];
    
    equipamentos.forEach(eq => {
        if (eq.proximaManutencao) {
            const dataProxima = new Date(eq.proximaManutencao);
            if (dataProxima < hoje) {
                const diasAtraso = Math.floor((hoje - dataProxima) / (1000 * 60 * 60 * 24));
                atrasados.push({
                    ...eq,
                    diasAtraso: diasAtraso
                });
            }
        }
    });
    
    if (atrasados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">Nenhum equipamento atrasado</td></tr>';
        return;
    }
    
    // Ordenar por dias de atraso (maior para menor)
    atrasados.sort((a, b) => b.diasAtraso - a.diasAtraso);
    
    atrasados.forEach(eq => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${eq.nome}</td>
            <td>${eq.etiqueta}</td>
            <td>${eq.setor}</td>
            <td>${eq.ultimaManutencao || '-'}</td>
            <td>${eq.proximaManutencao}</td>
            <td>
                <span class="status-badge ${eq.diasAtraso > 30 ? 'badge-danger' : 'badge-warning'}">
                    ${eq.diasAtraso} dias
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function gerarRelatorio() {
    console.log('Gerando relatório com filtros...');
    
    const periodo = document.getElementById('filtro-periodo').value;
    const setor = document.getElementById('filtro-setor').value;
    
    // TODO: Implementar filtros
    // Por enquanto, apenas recarrega os dados
    loadRelatorios();
    
    alert('Relatório atualizado com os filtros selecionados!');
}

function exportarRelatorio() {
    alert('Funcionalidade de exportação para Excel será implementada em breve!\n\nEsta função irá gerar um arquivo .xlsx com todos os dados do relatório.');
}

function imprimirRelatorio() {
    window.print();
}    
    console.log(`✓ ${manutencoesRealizadas.length} manutenções realizadas`);
}

console.log('✓ App.js carregado e pronto!');