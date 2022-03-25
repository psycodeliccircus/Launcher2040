const { ipcRenderer } = require('electron');

const version = document.getElementById('version');
const notification = document.getElementById('notification');
const message1 = document.getElementById('message1');
const restartButton = document.getElementById('restart-button');
    
ipcRenderer.send('app_version');
ipcRenderer.on('app_version', (event, arg) => {
  ipcRenderer.removeAllListeners('app_version');
  version.innerText = 'Versão ' + arg.version;
});

ipcRenderer.on('update_not_available', () => {
  ipcRenderer.removeAllListeners('update_not_available');
  message1.innerText = 'Seu launcher esta atualizador!';
  notification.classList.remove('hidden');
});

ipcRenderer.on('update_available', () => {
    ipcRenderer.removeAllListeners('update_available');
    message1.innerText = 'Uma nova atualização está disponível. Baixando agora...';
    notification.classList.remove('hidden');
  });

ipcRenderer.on('update_downloaded', () => {
  ipcRenderer.removeAllListeners('update_downloaded');
  message1.innerText = 'Atualização baixada. Ele será instalado na reinicialização. Reinicie agora?';
  restartButton.classList.remove('hidden');
  notification.classList.remove('hidden');
});

function closeNotification() {
  notification.classList.add('hidden');
}
    
function restartApp() {
  ipcRenderer.send('restart_app');
}

class BtnClearCache {
    constructor(buttonElement) {
        this.elem = buttonElement;
        this.panel = undefined;
        this.isPanelOpened = false;

        this.elem.addEventListener('click', e => {
            e.preventDefault();
            if (!this.isPanelOpened) {
                const panel = this.renderConfirmPanel();
                document.body.append(panel);
                this.isPanelOpened = true;
            }
        });

        ipcRenderer.on('cache:clear', message => {
            this.panel.remove();
            this.isPanelOpened = false;
        });
    }

    clearCache() {
        ipcRenderer.send('cache:clear');
    }

    renderConfirmPanel() {
        // Create panel element
        this.panel = document.createElement('div');
        this.panel.className = 'confirm-panel';

        const message = document.createElement('p');
        message.classList = "message";
        message.innerText = 'Tem certeza de que deseja limpar o cache do FiveM?';

        // Create buttons container
        const btnGroup = document.createElement('div');
        btnGroup.className = "btn-group";

        // Create button "Confirm"
        const btnConfirm = document.createElement('button');
        btnConfirm.className = 'btn btn-confirm';
        btnConfirm.innerText = 'Confirmar';

        // Create loader
        const loader = document.createElement('div');
        loader.className = 'loader';

        // Create button "Deny"
        const btnDeny = document.createElement('button');
        btnDeny.className = 'btn btn-deny';
        btnDeny.innerText = 'Cancelar';

        // Add elements to the panel
        this.panel.append(message);
        btnConfirm.append(loader);
        btnGroup.append(btnConfirm);
        btnGroup.append(btnDeny);
        this.panel.append(btnGroup);

        // Add event listeners on buttons
        btnConfirm.addEventListener('click', e => {
            this.clearCache();
            btnConfirm.classList.add('loading');
        });
        btnDeny.addEventListener('click', e => {
            this.panel.remove();
            this.isPanelOpened = false;
        });

        return this.panel;
    }
}
