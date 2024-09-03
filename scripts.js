const API_PRODUCTS = "https://fakestoreapi.com/products";
const shimmerCount = 6; // Number of shimmer items
let products = []; // Store products data globally
let filteredProducts = []; // Store filtered products globally for sorting

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
        // Simulate selecting 'price' option
        sortOptions.value = 'price';
        handleSortChange({ target: sortOptions }); // Trigger sorting
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
        renderProducts(filteredProducts, productList);
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
    
    productList.className = "product-item-list gap-25 d-grid"; // Reset to the original class

    if (sortValue === 'price') {
        sortedProducts.sort((a, b) => a.price - b.price);
    }

    renderProducts(sortedProducts, productList);
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
        renderProducts(filtered, productList);
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

    productList.className = "product-item-list gap-25 d-grid"; // Reset to the original class

    if (categories.length > 0) {
        filtered = products.filter(product => categories.includes(product.category));
    }

    renderProducts(filtered, productList);
    updateResultsCount(filtered.length); // Update the results count
}

function renderProducts(products, container) {
    container.innerHTML = ''; // Clear current product list
    const fragment = document.createDocumentFragment();

    products.forEach(product => {
        const productItem = createProductItem(product);
        fragment.appendChild(productItem);
    });

    requestAnimationFrame(() => {
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

    // Create and configure the product price element
    const productPrice = document.createElement('p');
    productPrice.textContent = `${product.price}`;
    productPrice.className = "product-item-price my-10 bold";

    // Create and configure the favorite button
    const productFav = document.createElement('button');
    productFav.className = "btn product-item-fav";
    productFav.ariaLabel = "Add to favorites";
    productFav.innerHTML = '<i class="material-icons">favorite_border</i>';

    // Append elements to the product item
    productItem.append(imageWrapper, productName, productPrice, productFav);

    return productItem;
}

function updateResultsCount(count) {
    const resultsCount = document.getElementById('results-count');
    resultsCount.textContent = `${count} Results found`;
}

function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}
