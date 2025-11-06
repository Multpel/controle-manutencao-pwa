/** 
 * app.js - Controle de Manutenção PWA
 * Versão para Vite + Firebase v12
 */

import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

// ========================================
// CONFIGURAÇÃO DO FIREBASE
// ========================================
const firebaseConfig = {
  apiKey: "AIzaSyDc4KaKwPYxJUiduqH1WzsHfWx4YEbS6aU",
  authDomain: "multpels-projects-vercel.firebaseapp.com",
  projectId: "multpels-projects-vercel",
  storageBucket: "multpels-projects-vercel.firebasestorage.app",
  messagingSenderId: "1038398020775",
  appId: "1:1038398020775:web:8e91a45634d8b3e36a0f82",
  measurementId: "G-D7XZM43V29"
}

// Inicializar Firebase (v12 - com Vite)
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)
const db = getFirestore(app)

console.log('✓ Firebase inicializado')

// ========================================
// DADOS SIMULADOS
// ========================================
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
]

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
      console.log('Menu item clicado:', targetScreen)

      if (targetScreen) {
        navigateToScreen(targetScreen)
      } else {
        exitApp()
      }
    })
  })

  // Event listener para formulário de equipamentos
  const equipamentoForm = document.getElementById('equipamentoForm')
  if (equipamentoForm) {
    equipamentoForm.addEventListener('submit', submitEquipamentoForm)
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
function showScreen(screenId, modo) {
  const screens = document.querySelectorAll('.screen')
  screens.forEach(screen => screen.style.display = 'none')
  const mainMenu = document.getElementById('main-menu')
  if (mainMenu) mainMenu.style.display = 'none'

  if (screenId === 'main-menu') {
    if (mainMenu) mainMenu.style.display = 'block'
    console.log('Menu principal exibido')
  } else {
    const targetScreen = document.getElementById(screenId)
    if (targetScreen) {
      targetScreen.style.display = 'block'
      if (screenId === 'cadastro-equipamento-screen' && modo === 'novo') {
        const form = document.getElementById('equipamento-form')
        if (form) form.reset()
        if (form) form.dataset.mode = "add"
        if (form) form.dataset.editId = ""
      }
    }
  }
}

function navigateToScreen(screenId) {
  console.log('→ Navegando para:', screenId)
  showScreen(screenId)
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
}

function backToMenu() {
  console.log('← Voltando ao menu')
  showScreen('main-menu')
}

function exitApp() {
  if (confirm('Deseja realmente sair da aplicação?')) {
    window.location.href = 'about:blank'
  }
}

// ======================================== 
// STUB FUNCTIONS (completar conforme necessário)
// ========================================
function carregarEquipamentosDoFirestore() {
  console.log('Carregando equipamentos do Firebase...')
}

function loadAgenda() {
  console.log('Carregando agenda...')
}

function loadPendentes() {
  console.log('Carregando manutenções pendentes...')
}

function loadRealizadas() {
  console.log('Carregando manutenções realizadas...')
}

function loadRelatorios() {
  console.log('Carregando relatórios...')
}

function submitEquipamentoForm(e) {
  console.log('Formulário de equipamento enviado')
}

function openCadastroForm() {
  console.log('Abrindo formulário de cadastro')
}

export { db, analytics }