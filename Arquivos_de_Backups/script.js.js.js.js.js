// Configurações da aplicação
const config = {
  metadataFile: 'files_metadata.json', // Arquivo que contém os metadados dos arquivos
  itemsPerPage: 20, // Número padrão de itens por página
  defaultSort: 'name' // Método padrão de ordenação
};

// Estado global da aplicação
let allFiles = []; // Armazena todos os arquivos carregados
let currentPage = 1; // Página atual da paginação
let currentSort = config.defaultSort; // Método de ordenação atual
let currentSearchTerm = ''; // Termo de busca atual

// Cache de elementos DOM para melhor performance
const fileList = document.getElementById('file-list');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const itemsPerPageSelect = document.getElementById('items-per-page');
const loadingElement = document.getElementById('loading');
const totalFilesElement = document.getElementById('total-files');
const totalSizeElement = document.getElementById('total-size');
const lastUpdateElement = document.getElementById('last-update');
const buildDateElement = document.getElementById('build-date');

/**
 * Converte bytes para um formato legível (KB, MB, GB, etc.)
 * @param {number} bytes - Tamanho em bytes
 * @returns {string} Tamanho formatado
 */
function formatBytes(bytes) {
  if (isNaN(bytes)) return 'Tamanho desconhecido';
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

/**
 * Formata uma data ISO para o padrão brasileiro com segundos
 * @param {string} isoString - Data em formato ISO
 * @returns {string} Data formatada
 */
function formatDate(isoString) {
  if (!isoString) return 'Data desconhecida';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', ' -');
  } catch (e) {
    return 'Data inválida';
  }
}

/**
 * Formata a data atual para exibição
 * @returns {string} Data atual formatada
 */
function formatCurrentDate() {
  const now = new Date();
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  return now.toLocaleString('pt-BR', options).replace(',', ' -');
}

/**
 * Atualiza as datas na página quando ela carrega
 */
function setupDatesOnLoad() {
  const currentDate = formatCurrentDate();
  
  // Atualiza a data no rodapé
  if (buildDateElement) {
    buildDateElement.textContent = currentDate;
  }
  
  // Atualiza a data no card de estatísticas
  if (lastUpdateElement) {
    lastUpdateElement.textContent = `${currentDate}`;// Última Atualização`;
  }
}

/**
 * Obtém o ícone correspondente ao tipo de arquivo
 * @param {string} filename - Nome do arquivo
 * @returns {string} Emoji correspondente ao tipo de arquivo
 */
function getFileIcon(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  const icons = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    ppt: '📽️',
    pptx: '📽️',
    txt: '📑',
    csv: '📊',
    json: '🔣',
    js: '📜',
    html: '🌐',
    css: '🎨',
    zip: '🗜️',
    rar: '🗜️',
    '7z': '🗜️',
    exe: '⚙️',
    dll: '🔧',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🖼️',
    svg: '🖼️',
    mp3: '🎵',
    wav: '🎵',
    mp4: '🎬',
    avi: '🎬',
    mkv: '🎬',
    mov: '🎬',
    iso: '💿',
    dmg: '💿',
    apk: '📱',
    apks: '📱',
    torrent: '🔽',
    py: '🐍',
    java: '☕',
    c: '🔧',
    cpp: '🔧',
    h: '🔧',
    sh: '💻',
    bat: '💻',
    ps1: '💻',
    md: '📝',
    yml: '⚙️',
    yaml: '⚙️',
    xml: '📄',
    sql: '🗃️',
    db: '🗃️',
    sqlite: '🗃️',
    log: '📋',
    ini: '⚙️',
    cfg: '⚙️',
    conf: '⚙️',
    rtf: '📝',
    odt: '📝',
    ods: '📊',
    odp: '📽️',
    default: '📄'
  };
  return icons[extension] || icons.default;
}

/**
 * Ordena os arquivos de acordo com o método especificado
 * @param {Array} files - Array de arquivos
 * @param {string} method - Método de ordenação
 * @returns {Array} Array ordenado
 */
function sortFiles(files, method) {
  const sorted = [...files];
  
  switch(method) {
    case 'name': 
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'nameDesc': 
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'date': 
      return sorted.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    case 'dateOldest': 
      return sorted.sort((a, b) => new Date(a.lastModified) - new Date(b.lastModified));
    case 'size': 
      return sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
    case 'sizeSmallest': 
      return sorted.sort((a, b) => (a.size || 0) - (b.size || 0));
    case 'type': 
      return sorted.sort((a, b) => (a.file_type || '').localeCompare(b.file_type || ''));
    case 'typeDesc': 
      return sorted.sort((a, b) => (b.file_type || '').localeCompare(a.file_type || ''));
    default: 
      return sorted;
  }
}

/**
 * Atualiza as estatísticas exibidas na página
 */
function updateStats() {
  const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  const lastModified = allFiles.length > 0 
    ? new Date(Math.max(...allFiles.map(f => new Date(f.lastModified))))
    : null;
  
  if (totalFilesElement) {
    totalFilesElement.textContent = allFiles.length;
  }
  
  if (totalSizeElement) {
    totalSizeElement.textContent = formatBytes(totalSize);
  }
  
  if (lastUpdateElement) {
    lastUpdateElement.textContent = lastModified 
      ? `${formatDate(lastModified)} Última Atualização`
      : 'N/A';
  }
  
  if (buildDateElement) {
    buildDateElement.textContent = formatCurrentDate();
  }
}

/**
 * Atualiza os controles de paginação
 */
function updatePagination() {
  const itemsPerPage = parseInt(itemsPerPageSelect.value);
  const totalPages = Math.ceil(allFiles.length / itemsPerPage);
  const paginationControls = document.getElementById('pagination-controls');
  const paginationInfo = document.getElementById('pagination-info');
  
  if (!paginationControls || !paginationInfo) return;
  
  if (totalPages <= 1) {
    paginationControls.innerHTML = '';
    paginationInfo.textContent = '';
    return;
  }
  
  // Criar botões de paginação
  let buttons = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // Botão anterior
  buttons.push(`
    <button class="pagination-button" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
      &laquo; Anterior
    </button>
  `);
  
  // Primeira página
  if (startPage > 1) {
    buttons.push(`<button class="pagination-button" data-page="1">1</button>`);
    if (startPage > 2) {
      buttons.push(`<span class="pagination-ellipsis">...</span>`);
    }
  }
  
  // Páginas intermediárias
  for (let i = startPage; i <= endPage; i++) {
    buttons.push(`
      <button class="pagination-button ${i === currentPage ? 'active' : ''}" data-page="${i}">
        ${i}
      </button>
    `);
  }
  
  // Última página
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      buttons.push(`<span class="pagination-ellipsis">...</span>`);
    }
    buttons.push(`<button class="pagination-button" data-page="${totalPages}">${totalPages}</button>`);
  }
  
  // Botão próximo
  buttons.push(`
    <button class="pagination-button" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
      Próximo &raquo;
    </button>
  `);
  
  paginationControls.innerHTML = buttons.join('');
  paginationInfo.textContent = `Página ${currentPage} de ${totalPages} | ${allFiles.length} arquivos`;
}

/**
 * Renderiza os arquivos na página
 */
function renderFiles() {
  // Filtrar por termo de busca
  let filteredFiles = currentSearchTerm
    ? allFiles.filter(file => file.name.toLowerCase().includes(currentSearchTerm.toLowerCase()))
    : [...allFiles];
  
  // Ordenar
  filteredFiles = sortFiles(filteredFiles, currentSort);
  
  // Paginar
  const itemsPerPage = parseInt(itemsPerPageSelect.value);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedFiles = filteredFiles.slice(startIdx, startIdx + itemsPerPage);
  
  // Renderizar
  if (fileList) {
    fileList.innerHTML = paginatedFiles.map(file => `
      <li class="file-item">
        <a href="${file.download_url}" target="_blank" rel="noopener noreferrer" class="file-link">
          <span class="file-icon">${getFileIcon(file.name)}</span>
          <span class="file-name">${file.name}</span>
        </a>
        <div class="file-details">
          <span class="file-size">📏 ${formatBytes(file.size)}</span>
          <span class="file-date">🕒 ${formatDate(file.lastModified)}</span>
          <span class="file-type">🗂️ ${file.file_type || 'desconhecido'}</span>
        </div>
      </li>
    `).join('');
  }
  
  // Atualizar paginação
  updatePagination();
  
  // Atualizar estatísticas
  updateStats();
  
  // Esconder loading
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
}

/**
 * Configura os event listeners da aplicação
 */
function setupEventListeners() {
  // Busca
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchTerm = e.target.value;
      currentPage = 1;
      renderFiles();
    });
  }
  
  // Ordenação
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderFiles();
    });
  }
  
  // Itens por página
  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener('change', () => {
      currentPage = 1;
      renderFiles();
    });
  }
  
  // Paginação
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('pagination-button')) {
      e.preventDefault();
      const page = parseInt(e.target.dataset.page);
      if (!isNaN(page) && page !== currentPage) {
        currentPage = page;
        renderFiles();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  });
}

/**
 * Carrega os metadados dos arquivos
 */
async function loadFilesMetadata() {
  try {
    const response = await fetch(config.metadataFile);
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    allFiles = await response.json();
    
    renderFiles();
  } catch (error) {
    console.error('Erro ao carregar metadados:', error);
    if (loadingElement) {
      loadingElement.innerHTML = `
        <div class="error-message">
          Erro ao carregar arquivos. Por favor, recarregue a página.
          <button onclick="window.location.reload()">Recarregar</button>
        </div>
      `;
    }
  }
}

/**
 * Configura o sistema de temas claro/escuro
 */
function setupThemeSystem() {
  const themeSelect = document.getElementById("theme");
  if (!themeSelect) return;

  /**
   * Aplica o tema selecionado
   * @param {string} theme - Tema a ser aplicado (light/dark/system)
   */
  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }

  // Aplica o tema salvo ou o padrão do sistema
  const savedTheme = localStorage.getItem("theme") || "system";
  themeSelect.value = savedTheme;
  applyTheme(savedTheme);

  // Listener para mudanças no select de tema
  themeSelect.addEventListener("change", () => {
    const selected = themeSelect.value;
    localStorage.setItem("theme", selected);
    applyTheme(selected);
  });

  // Listener para mudanças nas preferências do sistema
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (localStorage.getItem("theme") === "system") {
      applyTheme("system");
    }
  });
}

/**
 * Inicializa a aplicação
 */
function init() {
  setupDatesOnLoad();
  setupEventListeners();
  setupThemeSystem();
  loadFilesMetadata();
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
