<script>
  import { createScheduleShare, getUserShares, deleteScheduleShare, updateScheduleShare } from '$lib/sharing.js';
  import { onMount } from 'svelte';

  let shares = [];
  let loading = false;
  let showCreateForm = false;
  let copyingId = null;
  let createForm = {
    permissionLevel: 'view',
    description: '',
    expiresAt: '',
    expiresIn: 'never'
  };

  onMount(async () => {
    await loadShares();
  });

  async function loadShares() {
    loading = true;
    const result = await getUserShares();
    if (result.success) {
      shares = result.data;
    } else {
      console.error('Failed to load shares:', result.error);
    }
    loading = false;
  }

  async function handleCreateShare() {
    loading = true;
    
    let expiresAt = null;
    if (createForm.expiresIn !== 'never') {
      const now = new Date();
      switch (createForm.expiresIn) {
        case '1day':
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '1week':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '1month':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          if (createForm.expiresAt) {
            expiresAt = new Date(createForm.expiresAt);
          }
          break;
      }
    }

    const result = await createScheduleShare(
      createForm.permissionLevel,
      createForm.description || null,
      expiresAt
    );

    if (result.success) {
      await loadShares();
      showCreateForm = false;
      createForm = {
        permissionLevel: 'view',
        description: '',
        expiresAt: '',
        expiresIn: 'never'
      };
    } else {
      console.error('Failed to create share:', result.error);
    }
    
    loading = false;
  }

  async function handleDeleteShare(shareId) {
    if (!confirm('Are you sure you want to delete this share link?')) return;
    
    loading = true;
    const result = await deleteScheduleShare(shareId);
    if (result.success) {
      await loadShares();
    } else {
      console.error('Failed to delete share:', result.error);
    }
    loading = false;
  }

  async function copyToClipboard(url, shareId) {
    copyingId = shareId;
    try {
      await navigator.clipboard.writeText(url);
      setTimeout(() => copyingId = null, 1500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback: select the text
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setTimeout(() => copyingId = null, 1500);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  }

  function getPermissionBadgeClass(permission) {
    return permission === 'edit' ? 'permission-edit' : 'permission-view';
  }

  function getStatusBadgeClass(isExpired) {
    return isExpired ? 'status-expired' : 'status-active';
  }
</script>

<div class="sharing-container">
  <!-- Action Header -->
  <div class="action-header">
    <button
      on:click={() => showCreateForm = !showCreateForm}
      class="create-btn"
      class:cancel-btn={showCreateForm}
      disabled={loading}
    >
      <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {#if showCreateForm}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        {:else}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        {/if}
      </svg>
      {showCreateForm ? 'Cancel' : 'Create Share Link'}
    </button>
  </div>

  <!-- Create Form -->
  {#if showCreateForm}
    <div class="form-card">
      <div class="form-header">
        <svg class="form-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <h3 class="form-title">Create New Share Link</h3>
      </div>
      
      <form on:submit|preventDefault={handleCreateShare} class="form-content">
        <div class="form-grid">
          <div class="form-group">
            <label for="permission" class="form-label">
              Permission Level
            </label>
            <div class="select-wrapper">
              <select
                id="permission"
                bind:value={createForm.permissionLevel}
                class="form-select"
              >
                <option value="view">View Only</option>
                <option value="edit">View & Edit</option>
              </select>
            </div>
            <p class="form-help">
              {createForm.permissionLevel === 'edit' ? 'Recipients can view and modify your schedule' : 'Recipients can only view your schedule'}
            </p>
          </div>

          <div class="form-group">
            <label for="expires" class="form-label">
              Expires
            </label>
            <div class="select-wrapper">
              <select
                id="expires"
                bind:value={createForm.expiresIn}
                class="form-select"
              >
                <option value="never">Never</option>
                <option value="1day">1 Day</option>
                <option value="1week">1 Week</option>
                <option value="1month">1 Month</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="description" class="form-label">
            Description <span class="optional">(Optional)</span>
          </label>
          <input
            id="description"
            type="text"
            bind:value={createForm.description}
            placeholder="e.g., Family share, Academic advisor review, Study group coordination"
            class="form-input"
          />
        </div>

        {#if createForm.expiresIn === 'custom'}
          <div class="custom-date-group">
            <label for="customDate" class="form-label">
              Custom Expiration Date & Time
            </label>
            <input
              id="customDate"
              type="datetime-local"
              bind:value={createForm.expiresAt}
              class="form-input"
            />
          </div>
        {/if}

        <div class="form-actions">
          <button
            type="button"
            on:click={() => showCreateForm = false}
            class="form-btn secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            class="form-btn primary"
          >
            {#if loading}
              <svg class="spinner" fill="none" viewBox="0 0 24 24">
                <circle class="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="spinner-fill" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            {:else}
              <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Create Share Link
            {/if}
          </button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Loading State -->
  {#if loading && shares.length === 0}
    <div class="loading-state">
      <div class="loading-icon-wrapper">
        <svg class="loading-spinner" fill="none" viewBox="0 0 24 24">
          <circle class="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="spinner-fill" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <div class="loading-text">Loading your share links...</div>
    </div>
  {:else if shares.length === 0}
    <!-- Empty State -->
    <div class="empty-state">
      <div class="empty-icon-wrapper">
        <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
      <h3 class="empty-title">No share links created yet</h3>
      <p class="empty-description">Create secure share links to collaborate with advisors, family members, or study partners on your academic schedule.</p>
      <button
        on:click={() => showCreateForm = true}
        class="empty-cta-btn"
      >
        Create Your First Share Link
      </button>
    </div>
  {:else}
    <!-- Shares List -->
    <div class="shares-list">
      {#each shares as share}
        <div class="share-card">
          <div class="share-header">
            <div class="share-badges">
              <span class="badge {getPermissionBadgeClass(share.permissionLevel)}">
                {share.permissionLevel === 'edit' ? 'View & Edit' : 'View Only'}
              </span>
              <span class="badge {getStatusBadgeClass(share.isExpired)}">
                {share.isExpired ? 'Expired' : 'Active'}
              </span>
            </div>
            
            <div class="share-actions">
              <button
                on:click={() => copyToClipboard(share.shareUrl, share.id)}
                class="action-btn copy-btn"
                class:disabled={share.isExpired}
                disabled={share.isExpired}
              >
                <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copyingId === share.id ? 'Copied!' : 'Copy'}
              </button>
              <button
                on:click={() => handleDeleteShare(share.id)}
                class="action-btn delete-btn"
                disabled={loading}
              >
                <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
          
          <div class="share-content">
            {#if share.description}
              <h4 class="share-title">{share.description}</h4>
            {:else}
              <h4 class="share-title untitled">Untitled Share</h4>
            {/if}
            
            <div class="share-meta">
              <div class="meta-item">
                <span class="meta-label">Created:</span>
                <span class="meta-value">{formatDate(share.createdAt)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Expires:</span>
                <span class="meta-value">{formatDate(share.expiresAt)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Accessed:</span>
                <span class="meta-value">{share.accessCount} times</span>
              </div>
              {#if share.lastAccessed}
                <div class="meta-item">
                  <span class="meta-label">Last accessed:</span>
                  <span class="meta-value">{formatDate(share.lastAccessed)}</span>
                </div>
              {/if}
            </div>
          </div>
          
          <div class="share-footer">
            <div class="url-section">
              <div class="url-label">Share URL:</div>
              <div class="url-value">{share.shareUrl}</div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
	.sharing-container {
		max-width: 100%;
	}

	/* Action Header */
	.action-header {
		display: flex;
		justify-content: flex-start;
		margin-bottom: 2rem;
	}

	.create-btn {
		background: #2563eb;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.create-btn:hover {
		background: #1d4ed8;
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.create-btn.cancel-btn {
		background: #6b7280;
	}

	.create-btn.cancel-btn:hover {
		background: #4b5563;
	}

	.create-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	/* Form Card */
	.form-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
		overflow: hidden;
		transition: all 0.2s;
	}

	.form-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.5rem 1.5rem 1rem 1.5rem;
		border-bottom: 1px solid #f1f5f9;
	}

	.form-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: #2563eb;
		flex-shrink: 0;
	}

	.form-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0;
	}

	.form-content {
		padding: 1.5rem;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.optional {
		color: #9ca3af;
		font-weight: 400;
	}

	.form-input,
	.form-select {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		transition: all 0.2s;
		background: white;
	}

	.form-input:focus,
	.form-select:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.form-input::placeholder {
		color: #9ca3af;
	}

	.select-wrapper {
		position: relative;
	}

	.select-arrow {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: #6b7280;
		pointer-events: none;
	}

	.form-help {
		font-size: 0.75rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.custom-date-group {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding-top: 1rem;
		border-top: 1px solid #f1f5f9;
	}

	.form-btn {
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: none;
	}

	.form-btn.secondary {
		background: #f3f4f6;
		color: #374151;
	}

	.form-btn.secondary:hover {
		background: #e5e7eb;
	}

	.form-btn.primary {
		background: #2563eb;
		color: white;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.form-btn.primary:hover {
		background: #1d4ed8;
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.form-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	/* Loading State */
	.loading-state {
		text-align: center;
		padding: 4rem 2rem;
	}

	.loading-icon-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 4rem;
		height: 4rem;
		background: #dbeafe;
		border-radius: 50%;
		margin-bottom: 1rem;
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		color: #2563eb;
		animation: spin 1s linear infinite;
	}

	.loading-text {
		color: #64748b;
		font-size: 1.125rem;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
	}

	.empty-icon-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 5rem;
		height: 5rem;
		background: linear-gradient(135deg, #dbeafe 0%, #c7d2fe 100%);
		border-radius: 50%;
		margin-bottom: 1.5rem;
	}

	.empty-icon {
		width: 2.5rem;
		height: 2.5rem;
		color: #2563eb;
	}

	.empty-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0 0 0.75rem 0;
	}

	.empty-description {
		color: #64748b;
		max-width: 28rem;
		margin: 0 auto 1.5rem auto;
		line-height: 1.6;
	}

	.empty-cta-btn {
		background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
		color: white;
		border: none;
		font-weight: 500;
		padding: 0.875rem 1.75rem;
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
	}

	.empty-cta-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 15px -3px rgba(37, 99, 235, 0.3);
	}

	/* Shares List */
	.shares-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.share-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		overflow: hidden;
		transition: all 0.2s;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.share-card:hover {
		border-color: #cbd5e1;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.share-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem 1rem 1.5rem;
	}

	.share-badges {
		display: flex;
		gap: 0.5rem;
	}

	.badge {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid transparent;
	}

	.badge.permission-view {
		background: #dbeafe;
		color: #1d4ed8;
		border-color: #93c5fd;
	}

	.badge.permission-edit {
		background: #fed7aa;
		color: #c2410c;
		border-color: #fdba74;
	}

	.badge.status-active {
		background: #dcfce7;
		color: #166534;
		border-color: #86efac;
	}

	.badge.status-expired {
		background: #fee2e2;
		color: #991b1b;
		border-color: #fca5a5;
	}

	.share-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: 1px solid transparent;
	}

	.copy-btn {
		background: #f1f5f9;
		color: #475569;
		border-color: #e2e8f0;
	}

	.copy-btn:hover:not(.disabled) {
		background: #e2e8f0;
		border-color: #cbd5e1;
	}

	.copy-btn.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.delete-btn {
		background: #fef2f2;
		color: #dc2626;
		border-color: #fecaca;
	}

	.delete-btn:hover {
		background: #fee2e2;
		border-color: #fca5a5;
	}

	.delete-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.share-content {
		padding: 0 1.5rem 1rem 1.5rem;
	}

	.share-title {
		font-size: 1rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0 0 0.75rem 0;
	}

	.share-title.untitled {
		color: #64748b;
		font-style: italic;
		font-weight: 500;
	}

	.share-meta {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.5rem;
	}

	.meta-item {
		display: flex;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	.meta-label {
		color: #64748b;
		font-weight: 500;
	}

	.meta-value {
		color: #374151;
	}

	.share-footer {
		background: #f8fafc;
		border-top: 1px solid #f1f5f9;
		padding: 1rem 1.5rem;
	}

	.url-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.url-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #64748b;
	}

	.url-value {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', monospace;
		font-size: 0.75rem;
		color: #374151;
		word-break: break-all;
		background: white;
		padding: 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid #e2e8f0;
	}

	/* Icons */
	.btn-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		animation: spin 1s linear infinite;
	}

	.spinner-track {
		opacity: 0.25;
	}

	.spinner-fill {
		opacity: 0.75;
	}

	/* Animations */
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.form-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.share-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.share-actions {
			align-self: stretch;
		}

		.action-btn {
			flex: 1;
			justify-content: center;
		}

		.share-meta {
			grid-template-columns: 1fr;
		}

		.form-actions {
			flex-direction: column-reverse;
		}

		.form-btn {
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.sharing-container {
			margin: 0 -1rem;
		}

		.form-card,
		.share-card {
			border-radius: 0;
			border-left: none;
			border-right: none;
		}

		.empty-state,
		.loading-state {
			padding: 3rem 1rem;
		}
	}
</style>