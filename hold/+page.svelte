<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient.js';
  import ScheduleSharing from '$lib/components/ScheduleSharing.svelte';

  let user = null;
  let loading = true;

  onMount(async () => {
    // Check if user is authenticated
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      // Redirect to login if not authenticated
      goto('/');
      return;
    }
    
    user = currentUser;
    loading = false;
  });

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      goto('/');
    }
  });
</script>

<svelte:head>
  <title>Schedule Sharing - Schedulator</title>
</svelte:head>

{#if loading}
  <div class="flex justify-center items-center min-h-screen">
    <div class="text-gray-500">Loading...</div>
  </div>
{:else if user}
  <ScheduleSharing />
{:else}
  <div class="flex justify-center items-center min-h-screen">
    <div class="text-gray-500">Please log in to access schedule sharing.</div>
  </div>
{/if}