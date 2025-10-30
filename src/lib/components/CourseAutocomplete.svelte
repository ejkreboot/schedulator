<script>
	import { searchCourses } from '$lib/catalog.js';
	import { createEventDispatcher } from 'svelte';
	
	export let placeholder = 'Search courses...';
	export let value = '';
	export let disabled = false;
	
	const dispatch = createEventDispatcher();
	
	let searchResults = [];
	let showDropdown = false;
	let selectedIndex = -1;
	let inputElement;
	let dropdownElement;
	
	$: {
		if (value && value.length >= 2) {
			searchResults = searchCourses(value, 8);
			showDropdown = searchResults.length > 0;
		} else {
			searchResults = [];
			showDropdown = false;
		}
		selectedIndex = -1;
	}
	
	function handleInput(event) {
		value = event.target.value;
		dispatch('input', value);
	}
	
	function selectCourse(course) {
		const selectedCourse = {
			code: course.course_number,
			name: course.title,
            semester_hours: course.semester_hours,
			description: course.description || ''
		};
		
		value = course.course_number;
		showDropdown = false;
		selectedIndex = -1;
		
		dispatch('select', selectedCourse);
		inputElement.blur();
	}
	
	function handleKeydown(event) {
		if (!showDropdown) return;
		
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, searchResults.length - 1);
				scrollToSelected();
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				scrollToSelected();
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0 && searchResults[selectedIndex]) {
					selectCourse(searchResults[selectedIndex]);
				}
				break;
			case 'Escape':
				showDropdown = false;
				selectedIndex = -1;
				inputElement.blur();
				break;
		}
	}
	
	function scrollToSelected() {
		if (selectedIndex >= 0 && dropdownElement) {
			const selectedElement = dropdownElement.children[selectedIndex];
			if (selectedElement) {
				selectedElement.scrollIntoView({
					block: 'nearest',
					behavior: 'smooth'
				});
			}
		}
	}
	
	function handleBlur(event) {
		// Delay hiding dropdown to allow for clicks
		setTimeout(() => {
			showDropdown = false;
			selectedIndex = -1;
		}, 200);
	}
	
	function handleFocus() {
		if (value && searchResults.length > 0) {
			showDropdown = true;
		}
	}
	
	function getHighlightedText(text, query) {
		if (!query) return text;
		
		const regex = new RegExp(`(${query})`, 'gi');
		return text.replace(regex, '<mark>$1</mark>');
	}
</script>

<div class="autocomplete-container">
	<input
		bind:this={inputElement}
		type="text"
		{placeholder}
		{disabled}
		bind:value
		on:input={handleInput}
		on:keydown={handleKeydown}
		on:blur={handleBlur}
		on:focus={handleFocus}
		class="autocomplete-input"
		autocomplete="off"
		role="combobox"
		aria-expanded={showDropdown}
		aria-controls="autocomplete-listbox"
		aria-haspopup="listbox"
		aria-autocomplete="list"
	/>
	
	{#if showDropdown && searchResults.length > 0}
		<div 
			class="autocomplete-dropdown"
			bind:this={dropdownElement}
			role="listbox"
			id="autocomplete-listbox"
		>
			{#each searchResults as course, index}
				<button
					type="button"
					class="autocomplete-item"
					class:selected={index === selectedIndex}
					title="{course.description || course.title + ' - ' + course.semester_hours + ' credits'}"
					on:click={() => selectCourse(course)}
					role="option"
					aria-selected={index === selectedIndex}
				>
					<div class="course-main">
						<span class="course-code">
							{@html getHighlightedText(course.course_number, value)}
						</span>
						<span class="course-title">
							{@html getHighlightedText(course.title, value)}
						</span>
					</div>
					<div class="course-meta">
						<span class="course-credits">{course.semester_hours} credits</span>
						<span class="match-type" class:code-match={course.matchType === 'code'}>
							{course.matchType === 'code' ? 'Code' : 'Title'} match
						</span>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.autocomplete-container {
		position: relative;
		width: 100%;
	}
	
	.autocomplete-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}
	
	.autocomplete-input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}
	
	.autocomplete-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #d1d5db;
		border-top: none;
		border-radius: 0 0 0.375rem 0.375rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		max-height: 300px;
		overflow-y: auto;
		z-index: 1000;
	}
	
	.autocomplete-item {
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		padding: 0.75rem;
		cursor: pointer;
		transition: background-color 0.15s;
		border-bottom: 1px solid #f3f4f6;
	}
	
	.autocomplete-item:hover,
	.autocomplete-item.selected {
		background: #f8fafc;
	}
	
	.autocomplete-item:last-child {
		border-bottom: none;
	}
	
	.course-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.25rem;
	}
	
	.course-code {
		font-family: monospace;
		font-weight: 600;
		color: #1e293b;
		background: #f1f5f9;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		flex-shrink: 0;
	}
	
	.course-title {
		font-size: 0.875rem;
		color: #374151;
		line-height: 1.2;
	}
	
	.course-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		color: #6b7280;
	}
	
	.course-credits {
		font-weight: 500;
	}
	
	.match-type {
		font-size: 0.625rem;
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		background: #f3f4f6;
	}
	
	.match-type.code-match {
		background: #dbeafe;
		color: #1e40af;
	}
	
	:global(.autocomplete-container mark) {
		background: #fef08a;
		color: #1f2937;
		font-weight: 600;
		padding: 0;
	}
	
	/* Scrollbar styling */
	.autocomplete-dropdown::-webkit-scrollbar {
		width: 6px;
	}
	
	.autocomplete-dropdown::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	
	.autocomplete-dropdown::-webkit-scrollbar-thumb {
		background: #c1c1c1;
		border-radius: 3px;
	}
	
	.autocomplete-dropdown::-webkit-scrollbar-thumb:hover {
		background: #a8a8a8;
	}
</style>