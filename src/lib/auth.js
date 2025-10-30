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

export const signInWithOtp = async (email, redirectTo = undefined) => {
	const { data, error } = await supabase.auth.signInWithOtp({
		email,
		options: {
			shouldCreateUser: true,
			emailRedirectTo: redirectTo
		}
	});

	if (error) {
		console.error('Error sending OTP:', error.message);
		return { error };
	}

	return { data, error: null };
};

export const verifyOtp = async (email, token) => {
	const { data, error } = await supabase.auth.verifyOtp({
		email,
		token,
		type: 'email'
	});

	if (error) {
		console.error('Error verifying OTP:', error.message);
		return { error };
	}

	return { data, error: null };
};