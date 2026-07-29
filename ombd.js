'use strict';

// Global variables 
const form = document.querySelector('form');
const term = document.querySelector('#s');
const saveCheckbox = document.querySelector('#save');
const h1 = document.querySelector('h1');
const resultsDiv = document.querySelector('#results');
const loadMore = document.getElementById('loadmore');
const baseURL = 'https://www.omdbapi.com/';
const key = '426e1cee';

let endpoint;
let searchTerm;
let currentPage = 1;
let totalResults = 0;

// Intersection Observer 
const watcher = new IntersectionObserver(handleScroll, {threshold: 1});

// Global Listeners 
if (form) {
  form.addEventListener('submit', handleFormSubmit);
}

if (saveCheckbox) {
  saveCheckbox.addEventListener('change', handleCheckboxChange);
}

// Initialize Page 
loadPage();

/**
 * Loads Page (loadPage) - Loads the page on initialization.
 *    Retrieves saved search term from localStorage and 
 *    executes search if found.
 */
async function loadPage() {
  const savedTerm = localStorage.getItem('search');
  if (!savedTerm) return;
  
  term.value = savedTerm;
  searchTerm = savedTerm;
  saveCheckbox.checked = true;

  currentPage = 1;
  updateEndpoint();
  await getMovies();
}

/**
 * Handle Form Submit (handleFormSubmit) - Handles form submission.
 *    Prevents default, clears results, and initiates new search.
 * 
 * @param {Event} evt - The form submit event.
 */
function handleFormSubmit(evt) {
  evt.preventDefault();
  resultsDiv.innerHTML = '';
  currentPage = 1;
  
  if (saveCheckbox.checked) {
    localStorage.setItem('search', term.value.trim());
  }
  
  updateEndpoint();
  getMovies();
}

/**
 * Handle Checkbox Changes (handleCheckboxChange) - Handles checkbox 
 *    change event. Saves or removes search term from localStorage 
 *    based on checkbox state.
 */
function handleCheckboxChange() {
  const currentTerm = term.value.trim();
  
  if (saveCheckbox.checked && currentTerm) {
    localStorage.setItem('search', currentTerm);
  } else {
    localStorage.removeItem('search');
  }
}

/**
 * Clears Saved Search (forgetMe) - Clears the saved search term from localStorage,
 *    resets the search input field, unchecks the save checkbox, and clears
 *    the displayed movie results.
 */
function forgetMe() {
  localStorage.removeItem('search');
  term.value = '';
  saveCheckbox.checked = false;
  resultsDiv.innerHTML = '';
}

/**
 * Update EndPoint (updateEndpoint) - Updates the API endpoint 
 *    with current search term and page number.
 */
function updateEndpoint() {
  searchTerm = term.value.trim();
  endpoint = `${baseURL}?apikey=${key}&s=${encodeURIComponent(searchTerm)}&page=${currentPage}`;
}

/**
 * Get Movies (getMovies) - Fetches movies from OMDb API and renders 
 *    them to the page. Handles API errors including invalid API keys 
 *    and displays errors. Removes previous header and movies when 
 *    errors occur on first page.
 */
async function getMovies() {
  const moviesEndpoint = await fetch(endpoint);
  const serverResponse = await moviesEndpoint.json();
  
  if (moviesEndpoint.status === 401) {
    renderError(serverResponse.Error);
    return;
  }
  
  if (serverResponse.Response === 'False') {
    if (serverResponse.Error === 'Movie not found!') {
      updateHeader('0');
    } else {
      renderError(serverResponse.Error);
    }
    if (currentPage === 1) {
      resultsDiv.innerHTML = '';
    }
    return;
  }

  const total = serverResponse.totalResults;
  totalResults = parseInt(total);
  const searchArr = serverResponse.Search;

  searchArr.forEach(function(member) {
    const title = member.Title;
    const year = member.Year;
    let poster = member.Poster;

    if (poster === 'N/A' || !poster) {
      poster = 'https://placehold.co/150x200?text=No+Poster';
    }

    const section = document.createElement('section');
    const div = document.createElement('div');
    
    const h3 = document.createElement('h3');
    h3.textContent = title;
    div.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = `Year released: ${year}`;
    div.appendChild(p);

    const img = document.createElement('img');
    img.src = poster;
    img.alt = `${title} movie poster`;
    img.onerror = function() {
      this.src = 'https://placehold.co/150x200?text=No+Poster';
    };
    div.appendChild(img);

    section.appendChild(div);
    resultsDiv.appendChild(section);
  });

  if (currentPage === 1) {
    updateHeader(total);
  }

  observeLastMovie();
  loadMore.style.display = 'none';
}

/**
 * Update H2 (updateHeader) - Updates or creates the H2 header with search results.
 * 
 * @param {string} total - Total number of results from API.
 */
function updateHeader(total) {
  removeHeader();
  
  const span = document.createElement('span');
  span.id = 'term';
  span.textContent = searchTerm;
  
  const h2 = document.createElement('h2');
  h2.textContent = `${total} results for `;
  h2.appendChild(span);
  h1.insertAdjacentElement('afterend', h2);
}

/**
 * Removes H2 (removeHeader) - Removes the H2 header element if it exists.
 */
function removeHeader() {
  const existingH2 = h1.nextElementSibling;
  if (existingH2 && existingH2.tagName === 'H2') {
    existingH2.remove();
  }
}

/**
 * Server Response (serverResponse) - Renders error message 
 *    to the page in place of the H2 header.
 * 
 * @param {string} serverResponse - Error message from API or custom error.
 */
function renderError(serverResponse) {
  removeExistingError();
  removeHeader();

  const h2 = document.createElement('h2');
  h2.textContent = `Error: ${serverResponse}`;
  h1.insertAdjacentElement('afterend', h2);
}

/**
 * Remove Existing Errors (removeExistingError) - Removes existing 
 *    error message from the page.
 */
function removeExistingError() {
  const existingError = document.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
}

/**
 * Observer Last Movie (observeLastMovie) - Sets up Intersection Observer 
 *    on the last movie element.
 */
function observeLastMovie() {
  const lastMovie = resultsDiv.lastElementChild;
  if (lastMovie) {
    watcher.observe(lastMovie);
  }
}

/**
 * Handles Scrolling (handleScroll) - Handles intersection observer 
 *    callback for infinite scrolling.
 * 
 * @param {IntersectionObserverEntry[]} entries - Array of observer entries
 */
function handleScroll(entries) {
  const lastEntry = entries[entries.length - 1];

  if (lastEntry.isIntersecting) {
    watcher.unobserve(lastEntry.target);
    
    const moviesShown = currentPage * 10;
    if (moviesShown < totalResults) {
      loadMore.style.display = 'flex';
      currentPage++;
      updateEndpoint();
      getMovies();
    } else {
      loadMore.style.display = 'flex';
      loadMore.textContent = 'No more results';
    }
  }
}
