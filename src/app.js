/** 
 * app.js - Controle de Manutenção PWA
 * Versão para Vite + Firebase v12
 */

import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, arrayUnion } from 'firebase/firestore'
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
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('✓ Service Worker registrado'))
      .catch(err => console.error('✗ Erro ao registrar Service Worker:', err))
  }
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
      } else if (screenId === 'pendentes-screen') {
        loadPendentes()
      } else if (screenId === 'realizadas-screen') {
        loadRealizadas()
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
  console.log('📦 Carregando equipamentos do Firebase...')

  const tbody = document.getElementById('equipamentos-tbody')
  if (!tbody) {
    console.error('❌ tbody #equipamentos-tbody não encontrado')
    return
  }

  tbody.innerHTML = ''

  try {
    const equipamentosRef = collection(db, 'equipamentos')
    const snap = await getDocs(equipamentosRef)

    if (snap.empty) {
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      td.colSpan = 6
      td.textContent = 'Nenhum equipamento cadastrado.'
      td.style.textAlign = 'center'
      tr.appendChild(td)
      tbody.appendChild(tr)
      return
    }

    snap.forEach(docSnap => {
      const data = docSnap.data()

      const tr = document.createElement('tr')

      const tdNome = document.createElement('td')
      tdNome.textContent = data.nome || ''

      const tdEtiqueta = document.createElement('td')
      tdEtiqueta.textContent = data.etiqueta || ''

      const tdSetor = document.createElement('td')
      tdSetor.textContent = data.setor || ''

      const tdUltima = document.createElement('td')
      tdUltima.textContent = data.ultimaManutencao || '-'

      const tdProxima = document.createElement('td')
      tdProxima.textContent = data.proximaManutencao || '-'

      const tdAcoes = document.createElement('td')
      tdAcoes.textContent = '—' // depois colocamos Editar/Excluir

      tr.appendChild(tdNome)
      tr.appendChild(tdEtiqueta)
      tr.appendChild(tdSetor)
      tr.appendChild(tdUltima)
      tr.appendChild(tdProxima)
      tr.appendChild(tdAcoes)

      tbody.appendChild(tr)
    })
  } catch (err) {
    console.error('❌ Erro ao carregar equipamentos:', err)
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
      td.colSpan = 4
      td.textContent = 'Nenhum agendamento em aberto.'
      td.style.textAlign = 'center'
      tr.appendChild(td)
      tbody.appendChild(tr)
      return
    }

    for (const agSnap of snap.docs) {
      const ag = agSnap.data()

      // Busca o equipamento para pegar etiqueta/setor
      const eqRef = doc(db, 'equipamentos', ag.codigo)
      const eqSnap = await getDoc(eqRef)
      const eq = eqSnap.exists() ? eqSnap.data() : {}

      const tr = document.createElement('tr')

      const tdNome = document.createElement('td')
      tdNome.textContent = ag.equipamento || eq.nome || ''

      const tdEtiqueta = document.createElement('td')
      tdEtiqueta.textContent = eq.etiqueta || '-'

      const tdSetor = document.createElement('td')
      tdSetor.textContent = eq.setor || '-'

      const tdData = document.createElement('td')
      tdData.textContent = ag.dataPrevista || '-'

      tr.appendChild(tdNome)
      tr.appendChild(tdEtiqueta)
      tr.appendChild(tdSetor)
      tr.appendChild(tdData)

      tbody.appendChild(tr)
    }
  } catch (err) {
    console.error('❌ Erro ao carregar agenda:', err)
  }
}



function loadPendentes() {
  console.log('⚠️ Carregando manutenções pendentes...')
  // TODO: Implementar carregamento de pendentes
}

function loadRealizadas() {
  console.log('✓ Carregando manutenções realizadas...')
  // TODO: Implementar carregamento de realizadas
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

// Exportação ES6
export { db, analytics }
