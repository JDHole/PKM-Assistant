async function build_html(scope_plugin) {
  return `
    <div>
      <div data-user-agreement></div>
      <div class="actions-container">
        <button class="sc-report-bug-button">Report a bug</button>
        <button class="sc-request-feature-button">Request a feature</button>
      </div>
    </div>
  `;
}

export async function render(scope_plugin) {
  const html = await build_html.call(this, scope_plugin);
  const frag = this.create_doc_fragment(html);
  const container = frag.firstElementChild;
  post_process.call(this, scope_plugin, container);
  return container;
}

export async function post_process(scope_plugin, frag) {
  /* user agreement & env settings */
  const user_agreement_container = frag.querySelector('[data-user-agreement]');
  if (user_agreement_container) {
    const user_agreement = await scope_plugin.env.render_component(
      'user_agreement_callout',
      scope_plugin
    );
    user_agreement_container.appendChild(user_agreement);
  }

  /* header external links */
  const header_link = frag.querySelector('#header-callout a');
  if (header_link) {
    header_link.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(header_link.href, '_external');
    });
  }

  /* buttons */
  frag.querySelector('.sc-report-bug-button')?.addEventListener('click', () => {
    window.open(
      'https://github.com/JDHole/PKM-Assistant/issues/new',
      '_external'
    );
  });

  frag.querySelector('.sc-request-feature-button')?.addEventListener('click', () => {
    window.open(
      'https://github.com/JDHole/PKM-Assistant/issues/new',
      '_external'
    );
  });

  return frag;
}

import { Modal } from 'obsidian';
// Obsidian Modal that says "Need help and support? Reply to your Pro welcome email for priority support."
export class ScProSupportModal extends Modal {
  open() {
    super.open();
    this.titleEl.setText('Need help?');
    const content = this.contentEl.createDiv({ cls: 'sc-pro-support-modal' });
    content.createEl('p', {
      text: 'Report issues on our GitHub repository.',
    });
    const reportBugButton = content.createEl('button', { text: 'Report a bug', cls: 'mod-warning' });
    reportBugButton.addEventListener('click', () => {
      window.open(
        'https://github.com/JDHole/PKM-Assistant/issues/new',
        '_external'
      );
    });
    const closeButton = content.createEl('button', { text: 'Close' });
    closeButton.addEventListener('click', () => {
      this.close();
    });
  }
}