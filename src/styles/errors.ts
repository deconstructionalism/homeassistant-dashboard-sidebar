import { css } from 'lit';

/** The in-panel config-error box shown when validation fails. */
export const errorStyles = css`
  .config-error {
    margin: 12px;
    padding: 12px;
    border: 1px solid var(--error-color, #db4437);
    border-radius: var(--dashboard-sidebar-item-radius);
    background: color-mix(in srgb, var(--error-color, #db4437) 12%, transparent);
    color: var(--dashboard-sidebar-text-color);
    font-size: var(--ha-font-size-m, 0.85rem);
    overflow-y: auto;
  }

  .config-error-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: var(--ha-font-weight-bold, 600);
    margin-bottom: 8px;
  }

  .config-error-title ha-icon {
    color: var(--error-color, #db4437);
  }

  .config-error ul {
    margin: 0;
    padding-left: 18px;
  }

  .config-error li {
    margin: 4px 0;
  }
`;
