const fs = require('fs');
const path = require('path');

// Configurações do projeto
const config = {
  outputFile: 'files_metadata.json',
  excludedFiles: [
    'index.html',
    'style.css',
    'script.js',
    '.gitlab-ci.yaml',
    'files_metadata.json',
    'generate_metadata.js',
    'package.json',
    'package-lock.json',
    '.gitlab-ci.yml',
    '.gitignore',
    'Gemfile',
    '_config.yml',
    'README.md',
    'playlists.py',
    'requirements.txt',
    'Gemfile.lock'
  ],
  githubUser: 'josieljefferson12',
  githubRepo: 'josieljefferson12.github.io.oficial',
  branch: process.env.CI_COMMIT_REF_NAME || 'main'
};

// Função para listar arquivos localmente
function getLocalFiles() {
  const allFiles = fs.readdirSync('.', { withFileTypes: true });

  return allFiles
    .filter(dirent => dirent.isFile())
    .map(dirent => dirent.name)
    .filter(file => !config.excludedFiles.includes(file))
    .map(file => ({
      name: file,
      path: file,
      size: fs.statSync(file).size,
      lastModified: fs.statSync(file).mtime.toISOString(),
      download_url: `https://raw.githubusercontent.com/${config.githubUser}/${config.githubRepo}/${config.branch}/${file}`,
      file_type: path.extname(file).toLowerCase().replace('.', '') || 'file'
    }));
}

// Gerar metadados
function generateMetadata() {
  try {
    console.log('⏳ Iniciando geração de metadados...');

    const filesMetadata = getLocalFiles();

    fs.writeFileSync(
      path.join(__dirname, config.outputFile),
      JSON.stringify(filesMetadata, null, 2)
    );

    console.log(`✅ Metadados gerados com sucesso em ${config.outputFile}`);
    console.log(`📊 Total de arquivos processados: ${filesMetadata.length}`);

    // Lista de arquivos para debug
    console.log('📝 Arquivos incluídos:');
    filesMetadata.forEach(file => {
      console.log(`- ${file.name} (${file.file_type})`);
    });

  } catch (error) {
    console.error('❌ Erro ao gerar metadados:', error);
    process.exit(1);
  }
}

generateMetadata();