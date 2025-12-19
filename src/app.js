/** 
 * app.js - Controle de Manutenção PWA
 * Versão para Vite + Firebase v12
 */

import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, arrayUnion } from 'firebase/firestore'
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'


// ========================================
// CONFIGURAÇÃO DO FIREBASE (COM VARIÁVEIS DE AMBIENTE)
// ========================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Validar se as variáveis foram carregadas
if (!firebaseConfig.apiKey) {
  console.error('❌ Erro: Variáveis de ambiente do Firebase não configuradas!')
  console.error('Verifique se o arquivo .env.local existe e contém todas as variáveis VITE_FIREBASE_*')
}

// Inicializar Firebase (v12 - com Vite)
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)
const db = getFirestore(app)
const auth = getAuth(app)


console.log('✓ Firebase inicializado')

// ========================================
// DADOS SIMULADOS
// ========================================
let equipamentos = []
let manutencoesRealizadas = []
let nextEquipamentoId = 4

// ========================================
// INICIALIZAÇÃO E EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('✓ App.js inicializado com Vite + Firebase v12')

  // Event listener para os botões do menu principal
  const menuItems = document.querySelectorAll('.menu-item')
  console.log(`✓ ${menuItems.length} menu items encontrados`)

  menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault()
      const targetScreen = this.getAttribute('data-target-screen')
      console.log('🖱️ Menu item clicado:', targetScreen)

      if (targetScreen) {
        navigateToScreen(targetScreen)
      } else {
        exitApp()
      }
    })
  })

  // Event listener para formulário de equipamentos
  const equipamentoForm = document.getElementById('equipamento-form')
  if (equipamentoForm) {
    equipamentoForm.addEventListener('submit', salvarEquipamento)
    console.log('✓ Event listener do formulário registrado')
  } else {
    console.warn('⚠️ Formulário equipamento-form não encontrado')
  }

  // Botões "Voltar" e "Novo Cadastro"
  const backBtns = document.querySelectorAll('.btn-back')
  backBtns.forEach(btn => {
    btn.addEventListener('click', backToMenu)
  })

  const newCadastroBtns = document.querySelectorAll('[onclick="openCadastroForm()"]')
  newCadastroBtns.forEach(btn => {
    btn.addEventListener('click', openCadastroForm)
  })

  // Registrar Service Worker
// if ('serviceWorker' in navigator) {
//    navigator.serviceWorker.register('/service-worker.js')
//      .then(reg => console.log('✓ Service Worker registrado'))
//      .catch(err => console.error('✗ Erro ao registrar Service Worker:', err))
//  }
})

// ========================================
// FUNÇÕES DE NAVEGAÇÃO
// ========================================

// Função principal de navegação entre telas
function showScreen(screenId, modo) {
  console.log(`[showScreen] Navegando para: ${screenId}, modo: ${modo || 'padrão'}`)
  
  // Esconde todas as telas
  const screens = document.querySelectorAll('.screen')
  screens.forEach(screen => screen.style.display = 'none')
  
  const mainMenu = document.getElementById('main-menu')
  if (mainMenu) mainMenu.style.display = 'none'

  // Exibe menu principal
  if (screenId !== 'login-screen') {
  localStorage.setItem('lastScreen', screenId)
}

  if (screenId === 'main-menu') {
    if (mainMenu) {
      mainMenu.style.display = 'block'
      console.log('[showScreen] Menu principal exibido')
    }
    return
  }

  // Exibe a tela solicitada
  const targetScreen = document.getElementById(screenId)
  if (targetScreen) {
    targetScreen.style.display = 'block'
    console.log(`[showScreen] ✓ Tela ${screenId} exibida`)
    
    // Tratamento especial para cadastro de equipamento
    if (screenId === 'cadastro-equipamento-screen') {
      const form = document.getElementById('equipamento-form')
      const idInput = document.getElementById('equipamento-id')
      const headerTitle = document.querySelector('#cadastro-equipamento-screen .screen-header h1')
      
      if (modo === 'novo') {
        console.log('[showScreen] Modo NOVO - limpando formulário')
        if (form) {
          form.reset()
          form.dataset.mode = 'add'
          delete form.dataset.editId
        }
        if (idInput) idInput.value = ''
        if (headerTitle) {
          headerTitle.innerHTML = '<i class="fas fa-clipboard-list"></i> Novo Equipamento'
        }
      } else if (modo === 'editar') {
        console.log('[showScreen] Modo EDITAR')
        if (form) form.dataset.mode = 'edit'
        if (headerTitle) {
          headerTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Equipamento'
        }
      }
    }
    
    // Carrega dados da tela
    setTimeout(() => {
      if (screenId === 'equipamentos-screen') {
        carregarEquipamentosDoFirestore()
      } else if (screenId === 'agenda-screen') {
        loadAgenda()
      } else if (screenId === 'relatorios-screen') {
        loadRelatorios()
	  } else if (screenId === 'agendamento-pesquisa-screen') {
    carregarEquipamentosParaAgendamento()	
      }
    }, 100)
    
  } else {
    console.error(`[showScreen] ❌ ERRO: Tela "${screenId}" não encontrada`)
  }
}

// Função auxiliar (compatibilidade)
function navigateToScreen(screenId) {
  console.log('→ [navigateToScreen] Redirecionando para showScreen:', screenId)
  showScreen(screenId)
}

// Função para voltar ao menu
function backToMenu() {
  console.log('[backToMenu] ← Voltando ao menu principal')
  showScreen('main-menu')
}

// Função para sair do app
function exitApp() {
  if (confirm('Deseja realmente sair da aplicação?')) {
    window.location.href = 'about:blank'
  }
}

// ========================================
// AUTH (Login/Logout)
// ========================================

async function doLogin(e) {
  e.preventDefault()

  const emailInput = document.getElementById('login-email')
  const passInput = document.getElementById('login-password')

  const email = emailInput ? emailInput.value.trim() : ''
  const senha = passInput ? passInput.value : ''

  if (!email || !senha) {
    alert('Informe e-mail e senha.')
    return
  }

  try {
    await signInWithEmailAndPassword(auth, email, senha)
    console.log('✅ Login OK:', email)
  } catch (err) {
    console.error('❌ Erro no login:', err)
    alert('Falha no login. Verifique e-mail e senha.')
  }
}

async function doLogout() {
  try {
    await signOut(auth)
    console.log('✅ Logout OK')
  } catch (err) {
    console.error('❌ Erro no logout:', err)
  }
}

// Sempre que logar/deslogar, direciona a tela correta
onAuthStateChanged(auth, (user) => {
  if (!user) {
    showScreen('login-screen')
    return
  }

  const last = localStorage.getItem('lastScreen') || 'main-menu'
  showScreen(last)
})


window.doLogin = doLogin
window.doLogout = doLogout



// ========================================
// STUB FUNCTIONS (completar conforme necessário)
// ========================================

async function carregarEquipamentosDoFirestore() {
  console.log('📦 Carregando equipamentos...')
  
  try {
    const tbody = document.querySelector('#equipamentos-tbody')
    if (!tbody) {
      console.warn('⚠️ Tabela de equipamentos não encontrada')
      return
    }

    tbody.innerHTML = '' // Limpa tabela

    // Carrega todos os equipamentos
    const eqRef = collection(db, 'equipamentos')
    const snap = await getDocs(eqRef)

    if (snap.empty) {
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      td.colSpan = 6 // São 6 colunas agora
      td.textContent = 'Nenhum equipamento cadastrado.'
      td.style.textAlign = 'center'
      tr.appendChild(td)
      tbody.appendChild(tr)
      return
    }

    // Para cada equipamento, busca última e próxima manutenção
    for (const docSnap of snap.docs) {
      const eq = docSnap.data()
      const equipamentoId = docSnap.id

      const tr = document.createElement('tr')

      // Coluna: Nome
      const tdNome = document.createElement('td')
      tdNome.textContent = eq.nome || '-'
      tr.appendChild(tdNome)

      // Coluna: Etiqueta
      const tdEtiqueta = document.createElement('td')
      tdEtiqueta.textContent = eq.etiqueta || '-'
      tr.appendChild(tdEtiqueta)

      // Coluna: Setor
      const tdSetor = document.createElement('td')
      tdSetor.textContent = eq.setor || '-'
      tr.appendChild(tdSetor)

      // ========================================
      // 🆕 COLUNA: Última Manutenção
      // ========================================
      const tdUltimaManutencao = document.createElement('td')
      tdUltimaManutencao.textContent = 'Carregando...'
      tdUltimaManutencao.style.fontSize = '0.9em'
      tr.appendChild(tdUltimaManutencao)

      buscarUltimaManutencao(equipamentoId).then(dataUltima => {
        if (dataUltima) {
          const dataFormatada = formatarDataBR(dataUltima)
          tdUltimaManutencao.textContent = dataFormatada
          tdUltimaManutencao.style.color = '#28a745' // Verde
          tdUltimaManutencao.style.fontWeight = 'bold'
        } else {
          tdUltimaManutencao.textContent = 'Nunca realizada'
          tdUltimaManutencao.style.color = '#6c757d' // Cinza
          tdUltimaManutencao.style.fontStyle = 'italic'
        }
      }).catch(err => {
        console.error('❌ Erro ao buscar última manutenção:', err)
        tdUltimaManutencao.textContent = '-'
      })

      // ========================================
      // 🆕 COLUNA: Próxima Manutenção
      // ========================================
      const tdProximaManutencao = document.createElement('td')
      tdProximaManutencao.textContent = 'Carregando...'
      tdProximaManutencao.style.fontSize = '0.9em'
      tr.appendChild(tdProximaManutencao)

      buscarProximaManutencao(equipamentoId).then(dataProxima => {
        if (dataProxima) {
          const dataFormatada = formatarDataBR(dataProxima)
          tdProximaManutencao.textContent = dataFormatada
          tdProximaManutencao.style.color = '#007bff' // Azul
          tdProximaManutencao.style.fontWeight = 'bold'
        } else {
          tdProximaManutencao.textContent = 'Sem agendamento'
          tdProximaManutencao.style.color = '#6c757d' // Cinza
          tdProximaManutencao.style.fontStyle = 'italic'
        }
      }).catch(err => {
        console.error('❌ Erro ao buscar próxima manutenção:', err)
        tdProximaManutencao.textContent = '-'
      })

      // ========================================
      // Coluna: Ações
      // ========================================
      const tdAcoes = document.createElement('td')
      
      const btnEditar = document.createElement('button')
      btnEditar.textContent = '✏️ Editar'
      btnEditar.className = 'btn-small'
      btnEditar.addEventListener('click', () => abrirModalEditarEquipamento(docSnap.id, eq))
      
      const btnExcluir = document.createElement('button')
      btnExcluir.textContent = '🗑️ Excluir'
      btnExcluir.className = 'btn-small btn-danger'
      btnExcluir.addEventListener('click', () => excluirEquipamento(docSnap.id, eq.nome))
      
      tdAcoes.appendChild(btnEditar)
      tdAcoes.appendChild(btnExcluir)
      tr.appendChild(tdAcoes)

      tbody.appendChild(tr)
    }

    console.log(`✅ ${snap.size} equipamento(s) carregado(s)`)

  } catch (err) {
    console.error('❌ Erro ao carregar equipamentos:', err)
  }
}

/**
 * Busca a data da próxima manutenção agendada de um equipamento
 * @param {string} equipamentoId - ID do equipamento
 * @returns {Promise<string|null>} Data no formato "YYYY-MM-DD" ou null se não tem agendamento
 */
async function buscarProximaManutencao(equipamentoId) {
  try {
    const agendaRef = collection(db, 'agenda')
    const q = query(
      agendaRef,
      where('codigo', '==', equipamentoId),
      where('aberto', '==', true)
    )
    const snap = await getDocs(q)

    if (snap.empty) {
      return null // Não tem agendamento aberto
    }

    // Se houver múltiplos agendamentos abertos, pega a data mais próxima
    let proximaData = null
    snap.forEach(doc => {
      const agenda = doc.data()
      const dataPrevista = agenda.dataPrevista
      
      if (dataPrevista) {
        if (!proximaData || dataPrevista < proximaData) {
          proximaData = dataPrevista
        }
      }
    })

    return proximaData

  } catch (err) {
    console.error('❌ Erro ao buscar próxima manutenção:', err)
    return null
  }
}

async function carregarEquipamentosParaAgendamento() {
  console.log('📦 Carregando equipamentos para agendamento...')

  const ul = document.getElementById('equipamentos-disponiveis-list')
  if (!ul) {
    console.error('❌ #equipamentos-disponiveis-list não encontrado')
    return
  }
  ul.innerHTML = ''

  // 1) Buscar "agenda" em aberto (aberto == true)
  const agendadosSet = new Set()
  try {
    const agendaRef = collection(db, 'agenda')
    const q = query(agendaRef, where('aberto', '==', true))
    const snapAgenda = await getDocs(q)
    snapAgenda.forEach(d => {
      const a = d.data()
      if (a.codigo) agendadosSet.add(a.codigo) // codigo = equipamentoId
    })
  } catch (err) {
    console.error('❌ Erro ao carregar agenda (bloqueio):', err)
  }

  // 2) Buscar equipamentos e renderizar lista
  try {
    const equipamentosRef = collection(db, 'equipamentos')
    const snapEq = await getDocs(equipamentosRef)

    if (snapEq.empty) {
      const li = document.createElement('li')
      li.textContent = 'Nenhum equipamento cadastrado.'
      li.classList.add('empty-item')
      ul.appendChild(li)
      return
    }

    snapEq.forEach(docSnap => {
      const data = docSnap.data()
      const equipamentoId = docSnap.id
      const jaAgendado = agendadosSet.has(equipamentoId)

      const li = document.createElement('li')
      li.classList.add('equipamento-item')
      li.dataset.id = equipamentoId
      li.dataset.nome = data.nome || ''
      li.dataset.etiqueta = data.etiqueta || ''

      const label = document.createElement('label')
      label.style.display = 'flex'
      label.style.alignItems = 'center'
      label.style.gap = '10px'
      label.style.width = '100%'
      label.style.cursor = jaAgendado ? 'not-allowed' : 'pointer'

      const chk = document.createElement('input')
      chk.type = 'checkbox'
      chk.disabled = jaAgendado

      const txt = document.createElement('span')
      txt.textContent = `${data.nome || ''} — ${data.etiqueta || ''}`

      const status = document.createElement('span')
      status.style.marginLeft = 'auto'
      status.style.fontWeight = '600'
      status.textContent = jaAgendado ? 'Status: agendada' : ''

      // Ao marcar, segue para o form
      chk.addEventListener('change', () => {
        if (!chk.checked) return
        document.getElementById('agendamento-equipamento-id').value = equipamentoId
        document.getElementById('agendamento-nome-equipamento').value = data.nome || ''
        showScreen('agendamento-form-screen')
      })

      label.appendChild(chk)
      label.appendChild(txt)
      label.appendChild(status)
      li.appendChild(label)
      ul.appendChild(li)
    })
  } catch (err) {
    console.error('❌ Erro ao carregar equipamentos para agendamento:', err)
  }
}

// ========================================
// FUNÇÕES DE REAGENDAMENTO
// ========================================

function abrirModalReagendar({ agendamentoId, equipamentoNome, dataAtual }) {
  console.log('🔄 Abrindo modal de reagendamento', { agendamentoId, equipamentoNome, dataAtual })
  
  const backdrop = document.getElementById("modal-editar-agendamento")
  if (!backdrop) {
    console.error('❌ Modal backdrop não encontrado')
    return
  }

  document.getElementById("modal-agendamento-id").value = agendamentoId
  document.getElementById("modal-nome-equipamento").value = equipamentoNome || ""
  document.getElementById("modal-nova-data").value = dataAtual || ""
  document.getElementById("modal-motivo-cancelamento").value = ""

  backdrop.style.display = "flex"
}

function fecharModal() {
  console.log('❌ Fechando modal de reagendamento')
  
  const backdrop = document.getElementById("modal-editar-agendamento")
  if (backdrop) {
    backdrop.style.display = "none"
  }
  
  // Limpar campos do formulário
  const form = document.getElementById("editar-agendamento-form")
  if (form) {
    form.reset()
  }
}

async function salvarEdicaoAgendamento(event) {
  event.preventDefault()
  console.log('💾 Salvando edição de agendamento...')

  const idAntigo = document.getElementById("modal-agendamento-id").value.trim()
  const novaData = document.getElementById("modal-nova-data").value
  const motivoCancelamento = document.getElementById("modal-motivo-cancelamento").value.trim()

  // Validações
  if (!idAntigo || !novaData) {
    alert("Informe a nova data.")
    return
  }
  if (!motivoCancelamento) {
    alert("Informe o motivo do reagendamento.")
    return
  }

  try {
    // 1. Buscar agendamento original
    const antigoRef = doc(db, "agenda", idAntigo)
    const antigoSnap = await getDoc(antigoRef)

    if (!antigoSnap.exists()) {
      alert("Agendamento original não encontrado.")
      return
    }

    const antigo = antigoSnap.data()
    
    // Validar se ainda está aberto
    if (antigo.aberto !== true) {
      alert("Este agendamento não está mais aberto.")
      return
    }

    // 2. Criar novo agendamento
    const agendaRef = collection(db, "agenda")
    const novoRef = await addDoc(agendaRef, {
      codigo: antigo.codigo,
      equipamento: antigo.equipamento || "",
      dataPrevista: novaData,
      dataRealizada: null,
      motivo: "",
      observacoes: antigo.observacoes || "",
      aberto: true,
      criadoEm: new Date().toISOString(),
      reagendadoDe: idAntigo
    })

    console.log('✅ Novo agendamento criado:', novoRef.id)

    // 3. Cancelar agendamento antigo
    await updateDoc(antigoRef, {
      aberto: false,
      status: "cancelado",
      canceladoEm: new Date().toISOString(),
      motivoCancelamento,
      reagendadoPara: novoRef.id
    })

    console.log('✅ Agendamento antigo cancelado')

    // 4. Fechar modal e recarregar agenda
    fecharModal()
    alert("Reagendamento realizado com sucesso!")
    loadAgenda()
    
  } catch (err) {
    console.error('❌ Erro ao reagendar:', err)
    alert('Erro ao reagendar. Tente novamente.')
  }
}

async function loadAgenda() {
  console.log('📅 Carregando agenda...')
  const table = document.getElementById('agenda-table')
  if (!table) return
  const tbody = table.querySelector('tbody')
  if (!tbody) return
  tbody.innerHTML = ''

  try {
    const agendaRef = collection(db, 'agenda')
    const q = query(agendaRef, where('aberto', '==', true))
    const snap = await getDocs(q)

    if (snap.empty) {
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      td.colSpan = 5
      td.textContent = 'Nenhum agendamento em aberto.'
      td.style.textAlign = 'center'
      tr.appendChild(td)
      tbody.appendChild(tr)
      return
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    for (const agSnap of snap.docs) {
      const ag = agSnap.data()
      
      // Busca o equipamento para pegar etiqueta/setor
      const eqRef = doc(db, 'equipamentos', ag.codigo)
      const eqSnap = await getDoc(eqRef)
      const eq = eqSnap.exists() ? eqSnap.data() : {}

      const tr = document.createElement('tr')

      // Verificar se está atrasada (para indicador visual)
      const dataAgendada = new Date(ag.dataPrevista + 'T00:00:00')
      const atrasada = dataAgendada < hoje
      
      if (atrasada) {
        tr.style.color = '#dc3545'
        tr.style.fontWeight = '600'
      }

      // Coluna Nome
      const tdNome = document.createElement('td')
      tdNome.textContent = ag.equipamento || eq.nome || ''

      // Coluna Etiqueta
      const tdEtiqueta = document.createElement('td')
      tdEtiqueta.textContent = eq.etiqueta || '-'

      // Coluna Setor
      const tdSetor = document.createElement('td')
      tdSetor.textContent = eq.setor || '-'

      // Coluna Data Agendada
      const tdData = document.createElement('td')
      tdData.textContent = ag.dataPrevista || '-'

      // Coluna Ações (3 botões)
      const tdAcoes = document.createElement('td')
      tdAcoes.style.display = 'flex'
      tdAcoes.style.gap = '8px'
      tdAcoes.style.justifyContent = 'center'
      tdAcoes.style.flexWrap = 'wrap'

      // Botão EXECUTAR
      const btnExecutar = document.createElement('button')
      btnExecutar.type = 'button'
      btnExecutar.className = 'btn btn-primary'
      btnExecutar.style.fontSize = '0.85rem'
      btnExecutar.style.padding = '6px 12px'
      btnExecutar.innerHTML = '<i class="fas fa-check"></i> Executar'
      btnExecutar.addEventListener('click', (ev) => {
        ev.stopPropagation()
        abrirModalExecutar({
          agendamentoId: agSnap.id,
          equipamentoId: ag.codigo,
          equipamentoNome: ag.equipamento || eq.nome || '-',
          dataAgendada: ag.dataPrevista || ''
        })
      })

      // Botão REAGENDAR
      const btnReagendar = document.createElement('button')
      btnReagendar.type = 'button'
      btnReagendar.className = 'btn btn-secondary'
      btnReagendar.style.fontSize = '0.85rem'
      btnReagendar.style.padding = '6px 12px'
      btnReagendar.innerHTML = '<i class="fas fa-edit"></i> Reagendar'
      btnReagendar.addEventListener('click', (ev) => {
        ev.stopPropagation()
        abrirModalReagendar({
          agendamentoId: agSnap.id,
          equipamentoNome: ag.equipamento || eq.nome || '-',
          dataAtual: ag.dataPrevista || ''
        })
      })

      // Botão CANCELAR
      const btnCancelar = document.createElement('button')
      btnCancelar.type = 'button'
      btnCancelar.className = 'btn btn-secondary'
      btnCancelar.style.fontSize = '0.85rem'
      btnCancelar.style.padding = '6px 12px'
      btnCancelar.style.background = '#dc3545'
      btnCancelar.style.color = 'white'
      btnCancelar.style.borderColor = '#dc3545'
      btnCancelar.innerHTML = '<i class="fas fa-times"></i> Cancelar'
      btnCancelar.addEventListener('click', (ev) => {
        ev.stopPropagation()
        abrirModalCancelar({
          agendamentoId: agSnap.id,
          equipamentoId: ag.codigo,
          equipamentoNome: ag.equipamento || eq.nome || '-',
          dataAgendada: ag.dataPrevista || ''
        })
      })

      tdAcoes.appendChild(btnExecutar)
      tdAcoes.appendChild(btnReagendar)
      tdAcoes.appendChild(btnCancelar)

      tr.appendChild(tdNome)
      tr.appendChild(tdEtiqueta)
      tr.appendChild(tdSetor)
      tr.appendChild(tdData)
      tr.appendChild(tdAcoes)
      tbody.appendChild(tr)
    }

  } catch (err) {
    console.error('❌ Erro ao carregar agenda:', err)
  }
}




function loadRelatorios() {
  console.log('📊 Carregando relatórios...')
  // TODO: Implementar carregamento de relatórios
}

function filtrarEquipamentosAgendamento(term) {
  const texto = term.trim().toLowerCase()
  const itens = document.querySelectorAll('#equipamentos-disponiveis-list .equipamento-item')

  itens.forEach(li => {
    const nome = (li.dataset.nome || '').toLowerCase()
    const etiqueta = (li.dataset.etiqueta || '').toLowerCase()
    const match = nome.includes(texto) || etiqueta.includes(texto)
    li.style.display = match ? '' : 'none'
  })
}

/**
 * Busca a data da última manutenção realizada de um equipamento
 * @param {string} equipamentoId - ID do equipamento
 * @returns {Promise<string|null>} Data no formato "YYYY-MM-DD" ou null se nunca foi realizada
 */
async function buscarUltimaManutencao(equipamentoId) {
  try {
    const historicoRef = collection(db, 'historico')
    const q = query(
      historicoRef,
      where('equipamentoId', '==', equipamentoId),
      where('tipo', '==', 'realizada')
    )
    const snap = await getDocs(q)

    if (snap.empty) {
      return null // Nunca teve manutenção
    }

    // Encontra a manutenção com a data mais recente
    let ultimaData = null
    snap.forEach(doc => {
      const hist = doc.data()
      const dataRealizada = hist.dataRealizada
      
      if (dataRealizada) {
        if (!ultimaData || dataRealizada > ultimaData) {
          ultimaData = dataRealizada
        }
      }
    })

    return ultimaData

  } catch (err) {
    console.error('❌ Erro ao buscar última manutenção:', err)
    return null
  }
}

/**
 * Formata data ISO para padrão brasileiro
 * @param {string} dataISO - Data no formato "YYYY-MM-DD"
 * @returns {string} Data no formato "DD/MM/YYYY"
 */
function formatarDataBR(dataISO) {
  if (!dataISO) return '-'
  
  const partes = dataISO.split('-')
  if (partes.length !== 3) return dataISO
  
  const [ano, mes, dia] = partes
  return `${dia}/${mes}/${ano}`
}


async function salvarEquipamento(e) {
  e.preventDefault()
  console.log('💾 Salvando equipamento...')

  try {
    // Campos do formulário
    const idInput = document.getElementById('equipamento-id')
    const nomeInput = document.getElementById('equipamento-nome')
    const setorInput = document.getElementById('equipamento-setor')
    const etiquetaInput = document.getElementById('equipamento-etiqueta')

    if (!nomeInput || !setorInput || !etiquetaInput) {
      console.error('❌ Campos do formulário não encontrados')
      alert('Erro interno: campos do formulário não encontrados.')
      return
    }

    const codigo = idInput ? idInput.value.trim() : ''
    const nome = nomeInput.value.trim()
    const setor = setorInput.value.trim()
    const etiqueta = etiquetaInput.value.trim()

    // Validação básica
    if (!nome || !setor || !etiqueta) {
      alert('Preencha Nome, Etiqueta/Serial e Setor antes de salvar.')
      return
    }

    const equipamentosRef = collection(db, 'equipamentos')

    // Verificar unicidade da etiqueta (PK secundária)
    const snap = await getDocs(equipamentosRef)
    const etiquetaJaExiste = snap.docs.some(docSnap => {
      const data = docSnap.data()
      // Se for edição, ignora o próprio registro
      if (codigo && docSnap.id === codigo) return false
      return (data.etiqueta || '').toLowerCase() === etiqueta.toLowerCase()
    })

    if (etiquetaJaExiste) {
      alert('Já existe um equipamento cadastrado com essa Etiqueta/Serial.')
      return
    }

    // Modo add x edit
    if (!codigo) {
      // NOVO equipamento
      const docRef = await addDoc(equipamentosRef, {
        nome,
        setor,
        etiqueta,
        criadoEm: new Date().toISOString()
      })

      console.log('✅ Equipamento criado com ID:', docRef.id)
      alert('Equipamento cadastrado com sucesso!')
    } else {
      // EDITAR equipamento existente
      const docRef = doc(db, 'equipamentos', codigo)

      await updateDoc(docRef, {
        nome,
        setor,
        etiqueta,
        atualizadoEm: new Date().toISOString()
      })

      console.log('✅ Equipamento atualizado, ID:', codigo)
      alert('Equipamento atualizado com sucesso!')
    }

    // Após salvar, volta para a lista de equipamentos
    showScreen('equipamentos-screen')
  } catch (err) {
    console.error('❌ Erro ao salvar equipamento:', err)
    alert('Erro ao salvar equipamento. Tente novamente.')
  }
}

async function salvarAgendamento(e) {
  e.preventDefault()

  const equipamentoId = document.getElementById('agendamento-equipamento-id').value.trim()
  const equipamentoNome = document.getElementById('agendamento-nome-equipamento').value.trim()
  const dataPrevista = document.getElementById('data-agendada').value
  const obs = document.getElementById('agendamento-observacoes').value.trim()

  if (!equipamentoId || !dataPrevista) {
    alert('Selecione o equipamento e informe a data.')
    return
  }

  // Bloqueio: não permitir 2 agendamentos abertos pro mesmo equipamento
  const agendaRef = collection(db, 'agenda')
  const q = query(agendaRef, where('aberto', '==', true), where('codigo', '==', equipamentoId))
  const snap = await getDocs(q)
  if (!snap.empty) {
    alert('Este equipamento já possui um agendamento aberto.')
    showScreen('agendamento-pesquisa-screen')
    return
  }

  await addDoc(agendaRef, {
    codigo: equipamentoId,
    equipamento: equipamentoNome,
    dataPrevista,
    dataRealizada: null,
    motivo: '',
    observacoes: obs,
    aberto: true,
    criadoEm: new Date().toISOString()
  })

  alert('Agendamento criado com sucesso!')
  showScreen('agenda-screen')
}

// ========================================
// FUNÇÕES DE EXECUÇÃO DE MANUTENÇÃO
// ========================================

function abrirModalExecutar({ agendamentoId, equipamentoId, equipamentoNome, dataAgendada }) {
  console.log('✅ Abrindo modal de execução', { agendamentoId, equipamentoId, equipamentoNome, dataAgendada })
  
  const backdrop = document.getElementById("modal-executar-manutencao")
  if (!backdrop) {
    console.error('❌ Modal executar não encontrado')
    return
  }

  document.getElementById("exec-agendamento-id").value = agendamentoId
  document.getElementById("exec-equipamento-id").value = equipamentoId
  document.getElementById("exec-nome-equipamento").value = equipamentoNome
  document.getElementById("exec-data-agendada").value = dataAgendada
  
  // Define data de realização como hoje por padrão
  const hoje = new Date().toISOString().split('T')[0]
  document.getElementById("exec-data-realizacao").value = hoje
  
  document.getElementById("exec-numero-chamado").value = ""
  document.getElementById("exec-observacoes").value = ""
  
  backdrop.style.display = "flex"
}

function fecharModalExecutar() {
  console.log('❌ Fechando modal de execução')
  const backdrop = document.getElementById("modal-executar-manutencao")
  if (backdrop) {
    backdrop.style.display = "none"
  }
  
  const form = document.getElementById("executar-manutencao-form")
  if (form) {
    form.reset()
  }
}

async function salvarExecucaoManutencao(event) {
  event.preventDefault()
  console.log('💾 Salvando execução de manutenção...')
  
  const agendamentoId = document.getElementById("exec-agendamento-id").value.trim()
  const equipamentoId = document.getElementById("exec-equipamento-id").value.trim()
  const equipamentoNome = document.getElementById("exec-nome-equipamento").value.trim()
  const dataAgendada = document.getElementById("exec-data-agendada").value.trim()
  const dataRealizada = document.getElementById("exec-data-realizacao").value
  const numeroChamado = document.getElementById("exec-numero-chamado").value.trim()
  const observacoes = document.getElementById("exec-observacoes").value.trim()

  // Validações
  if (!agendamentoId || !dataRealizada || !numeroChamado) {
    alert("Preencha todos os campos obrigatórios.")
    return
  }

  try {
    // 1. Verificar se está em dia ou atrasada
    const dataAgendadaObj = new Date(dataAgendada + 'T00:00:00')
    const dataRealizadaObj = new Date(dataRealizada + 'T00:00:00')
    const emDia = dataRealizadaObj <= dataAgendadaObj
    const statusCor = emDia ? 'verde' : 'amarelo'
    
    console.log(`📊 Status: ${emDia ? 'EM DIA' : 'ATRASADA'} (${statusCor})`)

    // 2. Buscar agendamento para pegar todos os dados
    const agendaRef = doc(db, "agenda", agendamentoId)
    const agendaSnap = await getDoc(agendaRef)
    
    if (!agendaSnap.exists()) {
      alert("Agendamento não encontrado.")
      return
    }

    const agenda = agendaSnap.data()

    // 3. Gravar no histórico
    const historicoRef = collection(db, "historico")
    await addDoc(historicoRef, {
      agendamentoId: agendamentoId,
      equipamentoId: equipamentoId,
      equipamentoNome: equipamentoNome,
      tipo: "realizada",
      statusCor: statusCor,
      
      dataAgendada: dataAgendada,
      dataRealizada: dataRealizada,
      numeroChamado: numeroChamado,
      observacoes: observacoes,
      
      motivoCancelamento: null,
      motivoReagendamento: null,
      dataAnterior: null,
      novaData: null,
      
      criadoEm: new Date().toISOString()
    })
    console.log('✅ Histórico gravado com sucesso')

    // 4. Fechar agendamento
    await updateDoc(agendaRef, {
      aberto: false,
      status: "realizada",
      dataRealizada: dataRealizada,
      numeroChamado: numeroChamado,
      observacoesExecucao: observacoes,
      finalizadoEm: new Date().toISOString()
    })
    console.log('✅ Agendamento fechado')

    // ========================================
    // 5. CRIAR NOVO AGENDAMENTO AUTOMÁTICO PARA 90 DIAS ÚTEIS
    // ========================================
    try {
      // Usa a nova função que verifica conflitos
      const proximaData = await proximaDataUtilDisponivel(dataRealizada, 90)
      console.log('📅 Criando novo agendamento automático para:', proximaData)

      const agendaRefNova = collection(db, "agenda")
      await addDoc(agendaRefNova, {
        codigo: equipamentoId,
        equipamento: equipamentoNome,
        dataPrevista: proximaData,
        dataRealizada: null,
        motivo: '',
        observacoes: '',
        aberto: true,
        criadoEm: new Date().toISOString(),
        geradoAutomaticamente: true,
        geradoAutomaticamenteDe: agendamentoId
      })

      console.log('✅ Novo agendamento automático criado para 90 dias úteis')
    } catch (errAuto) {
      console.error('❌ Erro ao criar agendamento automático:', errAuto)
      // Não bloqueia o fluxo principal - apenas loga o erro
    }
    // ========================================

    // 6. Fechar modal e recarregar
    fecharModalExecutar()
    alert(`Manutenção executada com sucesso!\nStatus: ${emDia ? 'Em dia ✅' : 'Atrasada ⚠️'}\n\nPróximo agendamento criado automaticamente! 🎯`)
    loadAgenda()

  } catch (err) {
    console.error('❌ Erro ao executar manutenção:', err)
    alert('Erro ao executar manutenção. Tente novamente.')
  }
}


// ========================================
// FUNÇÕES UTILITÁRIAS DE DATA
// ========================================

/**
 * Busca feriados do Firestore para o ano especificado
 * @param {number} ano - Ano desejado (ex: 2026, 2027)
 * @returns {Promise<string[]>} Array de datas no formato "YYYY-MM-DD"
 */
async function getFeriadosDoAno(ano) {
  try {
    const feriadosRef = collection(db, 'feriados')
    const q = query(
      feriadosRef, 
      where('data', '>=', `${ano}-01-01`), 
      where('data', '<=', `${ano}-12-31`)
    )
    const snap = await getDocs(q)
    
    const feriados = []
    snap.forEach(doc => {
      const data = doc.data()
      if (data.data) {
        feriados.push(data.data)
      }
    })
    
    console.log(`📅 ${feriados.length} feriados carregados para ${ano}`)
    return feriados
    
  } catch (err) {
    console.error(`❌ Erro ao buscar feriados de ${ano}:`, err)
    return [] // Retorna vazio se houver erro
  }
}

/**
 * Verifica se já existe agendamento para a data
 * @param {string} dataISO - Data no formato "YYYY-MM-DD"
 * @returns {Promise<boolean>} true se já existe agendamento
 */
async function existeAgendamentoNaData(dataISO) {
  try {
    const agendaRef = collection(db, 'agenda')
    const q = query(
      agendaRef, 
      where('aberto', '==', true), 
      where('dataPrevista', '==', dataISO)
    )
    const snap = await getDocs(q)
    return !snap.empty
  } catch (err) {
    console.error('❌ Erro ao verificar data:', err)
    return false
  }
}

/**
 * Encontra a próxima data útil disponível (sem conflito de agendamento)
 * @param {string} dataISO - Data base no formato "YYYY-MM-DD"
 * @param {number} qtdDiasUteis - Quantidade de dias úteis a adicionar
 * @returns {Promise<string>} Data calculada e disponível no formato "YYYY-MM-DD"
 */
async function proximaDataUtilDisponivel(dataISO, qtdDiasUteis) {
  const dataBase = new Date(dataISO + 'T00:00:00')
  const anoBase = dataBase.getFullYear()
  const anoSeguinte = anoBase + 1
  
  // Busca feriados de 2 anos (caso atravesse o ano)
  const feriadosAnoAtual = await getFeriadosDoAno(anoBase)
  const feriadosAnoSeguinte = await getFeriadosDoAno(anoSeguinte)
  const todosFeriados = [...feriadosAnoAtual, ...feriadosAnoSeguinte]
  const feriadosSet = new Set(todosFeriados)
  
  let d = new Date(dataISO + 'T00:00:00')
  let adicionados = 0
  
  // Primeira fase: adiciona os dias úteis normalmente
  while (adicionados < qtdDiasUteis) {
    d.setDate(d.getDate() + 1)
    
    const diaSemana = d.getDay()
    const dataFormatada = d.toISOString().split('T')[0]
    
    const ehFimDeSemana = (diaSemana === 0 || diaSemana === 6)
    const ehFeriado = feriadosSet.has(dataFormatada)
    
    if (!ehFimDeSemana && !ehFeriado) {
      adicionados++
    }
  }
  
  // Segunda fase: verifica conflito e avança se necessário
  let dataFinal = d.toISOString().split('T')[0]
  let tentativas = 0
  const maxTentativas = 30 // Limite de segurança
  
  while (await existeAgendamentoNaData(dataFinal) && tentativas < maxTentativas) {
    console.log(`⚠️ Data ${dataFinal} já possui agendamento. Buscando próxima data útil...`)
    
    // Avança para o próximo dia útil
    d.setDate(d.getDate() + 1)
    
    const diaSemana = d.getDay()
    dataFinal = d.toISOString().split('T')[0]
    
    const ehFimDeSemana = (diaSemana === 0 || diaSemana === 6)
    const ehFeriado = feriadosSet.has(dataFinal)
    
    // Se caiu em fim de semana ou feriado, continua avançando
    if (ehFimDeSemana || ehFeriado) {
      continue
    }
    
    tentativas++
  }
  
  if (tentativas >= maxTentativas) {
    console.error('❌ Não foi possível encontrar data disponível após 30 tentativas')
  } else if (tentativas > 0) {
    console.log(`✅ Data ajustada para ${dataFinal} (${tentativas} ajuste(s) realizado(s))`)
  }
  
  return dataFinal
}


// ========================================
// FUNÇÕES DE CANCELAMENTO
// ========================================

function abrirModalCancelar({ agendamentoId, equipamentoId, equipamentoNome, dataAgendada }) {
  console.log('🚫 Abrindo modal de cancelamento', { agendamentoId, equipamentoId, equipamentoNome, dataAgendada })
  
  const backdrop = document.getElementById("modal-cancelar-agendamento")
  if (!backdrop) {
    console.error('❌ Modal cancelar não encontrado')
    return
  }

  document.getElementById("cancel-agendamento-id").value = agendamentoId
  document.getElementById("cancel-equipamento-id").value = equipamentoId
  document.getElementById("cancel-nome-equipamento").value = equipamentoNome
  document.getElementById("cancel-data-agendada").value = dataAgendada
  document.getElementById("cancel-motivo").value = ""
  
  backdrop.style.display = "flex"
}

function fecharModalCancelar() {
  console.log('❌ Fechando modal de cancelamento')
  const backdrop = document.getElementById("modal-cancelar-agendamento")
  if (backdrop) {
    backdrop.style.display = "none"
  }
  
  const form = document.getElementById("cancelar-agendamento-form")
  if (form) {
    form.reset()
  }
}

async function salvarCancelamento(event) {
  event.preventDefault()
  console.log('💾 Salvando cancelamento...')
  
  const agendamentoId = document.getElementById("cancel-agendamento-id").value.trim()
  const equipamentoId = document.getElementById("cancel-equipamento-id").value.trim()
  const equipamentoNome = document.getElementById("cancel-nome-equipamento").value.trim()
  const dataAgendada = document.getElementById("cancel-data-agendada").value.trim()
  const motivo = document.getElementById("cancel-motivo").value.trim()

  // Validações
  if (!agendamentoId || !motivo) {
    alert("Informe o motivo do cancelamento.")
    return
  }

  try {
    // 1. Buscar agendamento
    const agendaRef = doc(db, "agenda", agendamentoId)
    const agendaSnap = await getDoc(agendaRef)
    
    if (!agendaSnap.exists()) {
      alert("Agendamento não encontrado.")
      return
    }

    const agenda = agendaSnap.data()

    // 2. Gravar no histórico
    const historicoRef = collection(db, "historico")
    await addDoc(historicoRef, {
      agendamentoId: agendamentoId,
      equipamentoId: equipamentoId,
      equipamentoNome: equipamentoNome,
      tipo: "cancelada",
      statusCor: "vermelho",
      
      dataAgendada: dataAgendada,
      dataRealizada: null,
      numeroChamado: null,
      observacoes: agenda.observacoes || "",
      
      motivoCancelamento: motivo,
      motivoReagendamento: null,
      dataAnterior: null,
      novaData: null,
      
      criadoEm: new Date().toISOString()
    })
    console.log('✅ Histórico de cancelamento gravado')

    // 3. Fechar agendamento
    await updateDoc(agendaRef, {
      aberto: false,
      status: "cancelada",
      motivoCancelamento: motivo,
      canceladoEm: new Date().toISOString()
    })
    console.log('✅ Agendamento cancelado')

    // 4. Fechar modal e recarregar
    fecharModalCancelar()
    alert('Agendamento cancelado com sucesso!')
    loadAgenda()

  } catch (err) {
    console.error('❌ Erro ao cancelar:', err)
    alert('Erro ao cancelar agendamento. Tente novamente.')
  }
}


function openCadastroForm() {
  console.log('📝 Abrindo formulário de cadastro')
  showScreen('cadastro-equipamento-screen', 'novo')
}

// ========================================
// EXPORTAÇÕES GLOBAIS (CRÍTICO!)
// ========================================
window.showScreen = showScreen
window.navigateToScreen = navigateToScreen
window.backToMenu = backToMenu
window.exitApp = exitApp
window.salvarEquipamento = salvarEquipamento
window.openCadastroForm = openCadastroForm
window.filtrarEquipamentosAgendamento = filtrarEquipamentosAgendamento
window.salvarAgendamento = salvarAgendamento
window.abrirModalReagendar = abrirModalReagendar
window.fecharModal = fecharModal
window.salvarEdicaoAgendamento = salvarEdicaoAgendamento
window.abrirModalExecutar = abrirModalExecutar
window.fecharModalExecutar = fecharModalExecutar
window.salvarExecucaoManutencao = salvarExecucaoManutencao
window.abrirModalCancelar = abrirModalCancelar
window.fecharModalCancelar = fecharModalCancelar
window.salvarCancelamento = salvarCancelamento


// Exportação ES6
export { db, analytics }