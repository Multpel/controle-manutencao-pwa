/** 
 * app.js - Controle de Manutenção PWA
 * Versão para Vite + Firebase v12
 */

import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
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
  if (user) {
    console.log('✅ Usuário autenticado:', user.email)
    showScreen('main-menu')
  } else {
    console.log('⚠️ Nenhum usuário autenticado')
    showScreen('login-screen')
  }
})

window.doLogin = doLogin
window.doLogout = doLogout



// ========================================
// STUB FUNCTIONS (completar conforme necessário)
// ========================================

function carregarEquipamentosDoFirestore() {
  console.log('📦 Carregando equipamentos do Firebase...')
  // TODO: Implementar leitura do Firestore
}

function loadAgenda() {
  console.log('📅 Carregando agenda...')
  // TODO: Implementar carregamento da agenda
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

// Exportação ES6
export { db, analytics }
