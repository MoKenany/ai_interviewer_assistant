export class Modal {
    constructor(options) {
        this.title = options.title || '';
        this.content = options.content || '';
        this.onSave = options.onSave || null;
        this.saveText = options.saveText || 'Save';
        this.id = 'modal-' + Math.random().toString(36).substr(2, 9);
        this.render();
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'modal-backdrop';
        this.element.id = this.id;
        
        this.element.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${this.title}</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    ${this.content}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline cancel-btn">Cancel</button>
                    ${this.onSave ? `<button class="btn btn-primary save-btn">${this.saveText}</button>` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(this.element);

        // Events
        this.element.querySelector('.close-btn').addEventListener('click', () => this.close());
        this.element.querySelector('.cancel-btn').addEventListener('click', () => this.close());
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) this.close();
        });
        
        if (this.onSave) {
            this.element.querySelector('.save-btn').addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
                
                try {
                    await this.onSave(this.element);
                    this.close();
                } catch (err) {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            });
        }
    }

    show() {
        // Trigger reflow
        void this.element.offsetWidth;
        this.element.classList.add('show');
        document.body.classList.add('modal-open');
    }

    close() {
        this.element.classList.remove('show');
        document.body.classList.remove('modal-open');
        setTimeout(() => {
            this.element.remove();
        }, 200); // match transition
    }
}
