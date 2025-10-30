import { writable } from 'svelte/store';
import { supabase } from './supabaseClient.js';

export const user = writable(null);
export const loading = writable(true);

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
	user.set(session?.user ?? null);
	loading.set(false);
});

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
	user.set(session?.user ?? null);
	loading.set(false);
});

// Helper functions
export const signOut = async () => {
	const { error } = await supabase.auth.signOut();
	if (error) {
		console.error('Error signing out:', error.message);
		return { error };
	}
	return { error: null };
};