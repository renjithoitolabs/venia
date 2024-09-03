const API_PRODUCTS = "https://fakestoreapi.com/products";
const shimmerCount = 6; // Number of shimmer items
const itemsPerPage = 10; // Number of items to load per page
let products = []; // Store products data globally
let filteredProducts = []; // Store filtered products globally for sorting
let currentIndex = 0; // Track the current index of loaded products
let isAscending = true;

document.addEventListener('DOMContentLoaded', init);

function init() {
    const navbarToggler = document.querySelector('.navbar-toggler');
    const filterToggler = document.querySelector('.filter-toggler');
    const header = document.querySelector('.header');
    const filterProductsMobile = document.querySelector('.filter-products');
    const sortOptions = document.getElementById('sort-options');
    const sortOptionsMobile = document.getElementById('sort-options-mobile');
    const searchInput = document.getElementById('searchProducts');
    const categoryCheckboxes = document.querySelectorAll('.filter-products input[type="checkbox"]');
    const closeFilterIcon = document.querySelector('.close-filter');

    categoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleCategoryFilterChange);
    });

    navbarToggler.addEventListener('click', toggleNavbar.bind(null, header));
    filterToggler.addEventListener('click', toggleFilter.bind(null, filterProductsMobile));

    closeFilterIcon.addEventListener('click', () => {
        removeMobileClass(filterProductsMobile);
    });

    // Show loading shimmer and fetch products
    showLoadingShimmer();
    fetchAndRenderProducts();

    // Add event listener for sorting
    sortOptions.addEventListener('change', handleSortChange);
    sortOptionsMobile.addEventListener('click', () => {
        const currentSortValue = sortOptions.value;
    
        if (currentSortValue === 'price low') {
            // Switch to 'price high'
            sortOptions.value = 'price high';
        } else {
            // Switch to 'price low' or set it initially
            sortOptions.value = 'price low';
        }
    
        // Trigger sorting based on the new value
        handleSortChange({ target: sortOptions });
    });
    

    // Add debounced event listener for search
    const debouncedSearch = debounce(handleSearch, 300);
    searchInput.addEventListener('input', debouncedSearch);
}

function toggleNavbar(header) {
    header.classList.toggle('mobile');
}

function toggleFilter(filterProductsMobile) {
    filterProductsMobile.classList.toggle('mobile');
}

function removeMobileClass(element) {
    if (element.classList.contains('mobile')) {
        element.classList.remove('mobile');
    }
}

function showLoadingShimmer() {
    const productList = document.getElementById('product-list');
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < shimmerCount; i++) {
        const shimmerItem = document.createElement('li');
        shimmerItem.classList.add('shimmer-wrapper', 'shimmer-item');
        fragment.appendChild(shimmerItem);
    }

    productList.appendChild(fragment);
}

async function fetchAndRenderProducts() {
    const productList = document.getElementById('product-list');
    
    try {
        products = await fetchWithRetry(API_PRODUCTS);
        filteredProducts = [...products]; // Initially, filteredProducts is the same as products
        productList.innerHTML = ''; // Clear shimmer UI
        renderProducts(filteredProducts.slice(0, itemsPerPage), productList); // Render the first set of products
        currentIndex = itemsPerPage; // Set the initial index

        // Add Load More button if there are more products to load
        if (currentIndex < filteredProducts.length) {
            addLoadMoreButton();
        }

        updateResultsCount(filteredProducts.length); // Update the results count

    } catch (error) {
        console.error('Error fetching products:', error);
        productList.className = "failed-to-load d-flex flex-column justify-center align-center py-25";
        productList.innerHTML = `<img src="assets/failed-to-load.jpg" alt="Failed to load products" class="error-image"><a class="btn info">Try Again</a>`;
    }
}

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(response.statusText);
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
        }
    }
}

function handleSortChange(event) {
    const sortValue = event.target.value;
    let sortedProducts = [...filteredProducts];
    const productList = document.getElementById('product-list');

    // Clear existing products
    productList.innerHTML = ''; 

    if (sortValue === 'price low') {
        sortedProducts.sort((a, b) => a.price - b.price); // Ascending order
    } else if(sortValue === 'price high') {
        sortedProducts.sort((a, b) => b.price - a.price); // Descending order
    }

    // Reset current index and load sorted products
    currentIndex = 0;
    renderProducts(sortedProducts.slice(0, itemsPerPage), productList);
    currentIndex = itemsPerPage; // Set current index after rendering

    // Show or hide "Load More" button
    if (sortedProducts.length > currentIndex) {
        addLoadMoreButton();
    } else {
        removeLoadMoreButton();
    }

    updateResultsCount(sortedProducts.length); // Update the results count
}

function handleSearch(event) {
    const keyword = event.target.value.toLowerCase();
    const filtered = products.filter(product =>
        product.title.toLowerCase().includes(keyword)
    );

    const productList = document.getElementById('product-list');

    if (filtered.length === 0) {
        productList.className = "no-results-found d-flex justify-center py-25";
        productList.innerHTML = '<h1>No products found matching your search.</h1>';
    } else {
        productList.className = "product-item-list gap-25 d-grid"; // Reset to the original class

        // Reset current index and load searched products
        currentIndex = 0;
        renderProducts(filtered.slice(0, itemsPerPage), productList);
        currentIndex = itemsPerPage; // Set current index after rendering

        // Show or hide "Load More" button
        if (filtered.length > currentIndex) {
            addLoadMoreButton();
        } else {
            removeLoadMoreButton();
        }
    }

    updateResultsCount(filtered.length); // Update the results count
}


function handleCategoryFilterChange() {
    const selectedCategories = Array.from(document.querySelectorAll('.filter-products input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    
    filterProductsByCategory(selectedCategories);
}

function filterProductsByCategory(categories) {
    let filtered = products; // Assume `products` contains all fetched products
    const productList = document.getElementById('product-list');

    // Reset the class and clear existing products
    productList.className = "product-item-list gap-25 d-grid"; 
    productList.innerHTML = ''; 

    if (categories.length > 0) {
        filtered = products.filter(product => categories.includes(product.category));
    }

    // Reset current index and load filtered products
    currentIndex = 0;
    renderProducts(filtered.slice(0, itemsPerPage), productList);
    currentIndex = itemsPerPage; // Set current index after rendering

    // Show or hide "Load More" button
    if (filtered.length > currentIndex) {
        addLoadMoreButton();
    } else {
        removeLoadMoreButton();
    }

    updateResultsCount(filtered.length); // Update the results count
}

function renderProducts(products, container) {
    const fragment = document.createDocumentFragment();

    products.forEach(product => {
        const productItem = createProductItem(product);
        fragment.appendChild(productItem);
    });

    requestAnimationFrame(() => {
        container.innerHTML = ''; // Clear existing products
        container.appendChild(fragment); // Append all items at once
    });
}

function createProductItem(product) {
    const productItem = document.createElement('li');
    productItem.classList.add('product-item');

    // Create and configure the image element
    const productImage = document.createElement('img');
    productImage.src = ''; // Set to empty initially
    productImage.dataset.src = product.image; // Store the actual image URL in a data attribute
    productImage.alt = product.title;
    productImage.className = "product-item-image lazy";

    // Create and configure the wrapper div for the image
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'product-item-image-wrap';
    imageWrapper.appendChild(productImage);

    // Set up Intersection Observer for lazy loading
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                observer.unobserve(img);
            }
        });
    });

    observer.observe(productImage);

    // Create and configure the product name element
    const productName = document.createElement('h4');
    const maxLength = 30;
    const truncatedTitle = product.title.length > maxLength
        ? product.title.substring(0, maxLength) + '...' // Add ellipsis if text is too long
        : product.title;
    productName.textContent = truncatedTitle;
    productName.className = "product-item-name mt-10";

    // Create and configure the price element
    const price = document.createElement('p');
    price.className = "product-item-price";
    price.textContent = `₹ ${product.price}`;

    // Create and configure the favorite icon element
    const favoriteIcon = document.createElement('button');
    favoriteIcon.className = "btn";
    favoriteIcon.innerHTML = '<i class="material-icons">favorite_border</i>';

    // Append all elements to the product item
    productItem.appendChild(imageWrapper);
    productItem.appendChild(productName);
    productItem.appendChild(price);
    productItem.appendChild(favoriteIcon);

    return productItem;
}

function addLoadMoreButton() {
    const productList = document.getElementById('product-list');
    let loadMoreBtn = document.getElementById('load-more-btn');

    if (!loadMoreBtn) {
        loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'load-more-btn';
        loadMoreBtn.textContent = 'Load More';
        loadMoreBtn.className = 'load-more-btn btn info mt-30';
        loadMoreBtn.addEventListener('click', loadMoreProducts);
        productList.parentNode.appendChild(loadMoreBtn);
    }
}

function removeLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.remove();
    }
}

function loadMoreProducts() {
    const productList = document.getElementById('product-list');
    
    // Set nextProducts to the entire filteredProducts array
    const nextProducts = filteredProducts;

    renderProducts(nextProducts, productList);

    // Update currentIndex and check if the button needs to be hidden
    currentIndex += itemsPerPage;
    if (currentIndex >= filteredProducts.length) {
        removeLoadMoreButton();
    }
}

function updateResultsCount(count) {
    const resultsCountElement = document.getElementById('results-count');
    if (resultsCountElement) {
        resultsCountElement.textContent = `${count} items found`;
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

