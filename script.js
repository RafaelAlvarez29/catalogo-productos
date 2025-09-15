if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registrado', reg))
            .catch(err => console.error('Error al registrar el SW', err));
    });
}


document.addEventListener('DOMContentLoaded', () => {
    // --- MODELO DE DATOS Y CONFIGURACIÓN ---
    let productos = [];
    let categorias = [];
    let currentEditingProductId = null;

    // --- NUEVOS ESTADOS PARA FILTRO Y ORDEN ---
    let currentCategoryFilter = 'all';
    let currentSortOrder = 'default';

    // Valores por defecto para appConfig
    const defaultConfig = {
        productViewMode: 'grid',
        theme: 'light',
        productImageView: 'cover'
    };
    let appConfig = { ...defaultConfig };


    // --- ELEMENTOS DEL DOM ---
    const productsListContainer = document.getElementById('products-list');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const toastElement = document.getElementById('toast');
    const loadingIndicatorMain = document.getElementById('loading-indicator-main');
    const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');

    // --- NUEVOS ELEMENTOS DEL DOM ---
    const viewModeBtn = document.getElementById('view-mode-btn');
    const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
    const filtersContainer = document.getElementById('filters-container');
    const sortSelect = document.getElementById('sort-select');

    // Modales
    const editProductModalElement = document.getElementById('edit-product-modal');
    const addProductModalElement = document.getElementById('add-product-modal');
    const categoriesModalElement = document.getElementById('categories-modal');
    const settingsModalElement = document.getElementById('settings-modal');

    // Formularios y campos: Añadir Producto
    const addProductForm = document.getElementById('add-product-form');
    const addProductNameInput = document.getElementById('add-product-name');
    const addProductPriceInput = document.getElementById('add-product-price');
    const addImagePreview = document.getElementById('add-image-preview');
    const addImageFileInput = document.getElementById('add-image-file-input');
    const addProductImageUrlInput = document.getElementById('add-product-image-url');
    const addTagInput = document.getElementById('add-tag-input');
    const addTagsMenu = document.getElementById('add-tags-menu');
    const addTagsContainer = document.getElementById('add-tags-container');
    const continueAddingCheckbox = document.getElementById('continue-adding-check');
    const addSaveBtn = document.getElementById('add-save-btn');
    const addCancelBtn = document.getElementById('add-cancel-btn');
    const closeAddModalBtn = document.getElementById('close-add-modal');


    // Formularios y campos: Editar Producto
    const editProductForm = document.getElementById('edit-product-form');
    const editProductIdInput = document.getElementById('edit-product-id');
    const editProductNameInput = document.getElementById('edit-product-name');
    const editProductPriceInput = document.getElementById('edit-product-price');
    const editImagePreview = document.getElementById('edit-image-preview');
    const editImageFileInput = document.getElementById('edit-image-file-input');
    const editProductImageUrlInput = document.getElementById('edit-product-image-url');
    const editTagInput = document.getElementById('edit-tag-input');
    const editTagsMenu = document.getElementById('edit-tags-menu');
    const editTagsContainer = document.getElementById('edit-tags-container');
    const editSaveBtn = document.getElementById('edit-save-btn');
    const editCancelBtn = document.getElementById('edit-cancel-btn');
    const deleteProductBtn = document.getElementById('delete-product-btn');
    const closeEditModalBtn = document.getElementById('close-edit-modal');

    // Formularios y campos: Gestionar Categorías
    const manageCategoriesListElement = document.getElementById('manage-categories-list');
    const newCategoryInput = document.getElementById('new-category-input');
    const addNewCategoryBtn = document.getElementById('add-new-category-btn');
    const categoriesDoneBtn = document.getElementById('categories-done-btn');
    const closeCategoriesModalBtn = document.getElementById('close-categories-modal');

    // Formularios y campos: Configuración
    const closeSettingsModalBtn = document.getElementById('close-settings-modal');
    const settingsDoneBtn = document.getElementById('settings-done-btn');
    const productViewModeRadios = document.querySelectorAll('input[name="product-view-mode"]');
    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataFileInput = document.getElementById('import-data-file-input');
    const clearAllDataBtn = document.getElementById('clear-all-data-btn');


    // Navegación y FAB
    const navHomeBtn = document.getElementById('nav-home');
    const navCategoriesBtn = document.getElementById('nav-categories');
    const navAddBtn = document.getElementById('nav-add');
    const navSettingsBtn = document.getElementById('nav-settings');
    const fabAddProductBtn = document.getElementById('fab-add-product-btn');

    // Formularios y campos: Añadir Producto
    const addUploadBtn = document.getElementById('add-upload-btn');
    const addCameraBtn = document.getElementById('add-camera-btn');

    // Formularios y campos: Editar Producto
    const editUploadBtn = document.getElementById('edit-upload-btn');
    const editCameraBtn = document.getElementById('edit-camera-btn');

    // --- FUNCIONES AUXILIARES ---
    const generateId = () => '_' + Math.random().toString(36).substring(2, 11);

    const formatPrice = (price) => {
        const number = parseFloat(price);
        if (isNaN(number)) {
            return '$0.00';
        }
        const formatter = new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        return formatter.format(number);
    };

    const showToast = (message, type = 'info') => {
        if (!toastElement) return;
        toastElement.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')}"></i> ${message}`;
        toastElement.className = `toast ${type} show`;

        setTimeout(() => {
            toastElement.classList.remove('show');
        }, 3000);
        setTimeout(() => {
            toastElement.className = 'toast';
        }, 3500);
    };


    const showLoading = (show) => {
        if (loadingIndicatorMain) {
            loadingIndicatorMain.style.display = show ? 'flex' : 'none';
        }
    };

    const applyTheme = () => {
        if (appConfig.theme === 'dark') {
            document.body.classList.add('dark-mode');
            if (themeToggleCheckbox) themeToggleCheckbox.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            if (themeToggleCheckbox) themeToggleCheckbox.checked = false;
        }
    };

    // --- ALMACENAMIENTO LOCAL ---
    const saveAppData = () => {
        try {
            localStorage.setItem('productos', JSON.stringify(productos));
            localStorage.setItem('categorias', JSON.stringify(categorias));
            localStorage.setItem('appConfig', JSON.stringify(appConfig));
        } catch (e) {
            console.error("Error guardando en localStorage:", e);
            showToast("Error al guardar datos. Puede que el almacenamiento esté lleno.", "error");
        }
    };

    const loadAppData = () => {
        showLoading(true);
        const storedProductos = localStorage.getItem('productos');
        const storedCategorias = localStorage.getItem('categorias');
        const storedConfig = localStorage.getItem('appConfig');

        if (storedProductos) {
            productos = JSON.parse(storedProductos);
        } else {
            productos = [
                { id: generateId(), nombre: "Leche Entera 1L", precio: 25.50, imagen: "", categoria: ["Lácteos"], tipoPrecio: "unidad" },
                { id: generateId(), nombre: "Pan de Caja Integral", precio: 42.00, imagen: "", categoria: ["Panadería", "Vegano"], tipoPrecio: "unidad" },
                { id: generateId(), nombre: "Manzanas Fuji (kg)", precio: 55.90, imagen: "", categoria: ["Frutas"], tipoPrecio: "kg" },
            ];
        }

        if (storedCategorias) {
            categorias = JSON.parse(storedCategorias);
        } else {
            const allProductCats = productos.flatMap(p => p.categoria);
            categorias = [...new Set(allProductCats)].sort();
            if (categorias.length === 0) {
                categorias = ["General", "Ofertas", "Nuevo", "Bebidas", "Snacks"];
            }
        }
        if (!Array.isArray(categorias)) categorias = [];

        if (storedConfig) {
            try {
                const loadedConfig = JSON.parse(storedConfig);
                appConfig = { ...defaultConfig, ...loadedConfig };
            } catch (e) {
                appConfig = { ...defaultConfig };
            }
        } else {
            appConfig = { ...defaultConfig };
        }

        applyTheme();
        applyProductViewMode();
        applyImageViewMode();
        showLoading(false);
    };

    if (themeToggleCheckbox) {
        themeToggleCheckbox.addEventListener('change', () => {
            appConfig.theme = themeToggleCheckbox.checked ? 'dark' : 'light';
            applyTheme();
            saveAppData();
            showToast(`Tema cambiado a modo ${appConfig.theme === 'dark' ? 'oscuro' : 'claro'}.`, 'info');
        });
    }

    // --- RENDERIZADO ---
    const applyProductViewMode = () => {
        const icon = viewModeBtn.querySelector('i');
        if (appConfig.productViewMode === 'grid') {
            productsListContainer.classList.add('grid-view');
            icon.className = 'fas fa-list';
        } else {
            productsListContainer.classList.remove('grid-view');
            icon.className = 'fas fa-th-large';
        }
        const radioToSelect = document.querySelector(`input[name="product-view-mode"][value="${appConfig.productViewMode}"]`);
        if (radioToSelect) radioToSelect.checked = true;
    };

    const applyImageViewMode = () => {
        if (productsListContainer) {
            productsListContainer.classList.remove('image-view-cover', 'image-view-contain');
            productsListContainer.classList.add(appConfig.productImageView === 'contain' ? 'image-view-contain' : 'image-view-cover');
        }
        const radioToSelect = document.querySelector(`input[name="product-image-view"][value="${appConfig.productImageView}"]`);
        if (radioToSelect) radioToSelect.checked = true;
    };

    const renderProducts = () => {
        if (!productsListContainer) return;
        showLoading(false);

        // --- NUEVO PIPELINE DE FILTRADO Y ORDENAMIENTO ---
        let productosFiltrados = [...productos];

        // 1. Filtrar por Categoría
        if (currentCategoryFilter !== 'all') {
            productosFiltrados = productosFiltrados.filter(p => p.categoria.includes(currentCategoryFilter));
        }

        // 2. Filtrar por Término de Búsqueda
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            productosFiltrados = productosFiltrados.filter(product =>
                product.nombre.toLowerCase().includes(searchTerm) ||
                (product.categoria && Array.isArray(product.categoria) && product.categoria.some(cat => cat.toLowerCase().includes(searchTerm)))
            );
        }

        // 3. Ordenar
        switch (currentSortOrder) {
            case 'price-asc':
                productosFiltrados.sort((a, b) => a.precio - b.precio);
                break;
            case 'price-desc':
                productosFiltrados.sort((a, b) => b.precio - a.precio);
                break;
            case 'name-asc':
                productosFiltrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
                break;
            case 'name-desc':
                productosFiltrados.sort((a, b) => b.nombre.localeCompare(a.nombre));
                break;
            default: // 'default' - Mantiene el orden original (más reciente primero, ya que se añaden con unshift)
                break;
        }

        // 4. Renderizar el resultado
        productsListContainer.innerHTML = '';
        if (productosFiltrados.length === 0) {
            productsListContainer.innerHTML = `
                        <div class="no-results">
                            <i class="fas fa-search"></i>
                            <h3>Sin resultados</h3>
                            <p>No se encontraron productos que coincidan con tus criterios.</p>
                        </div>`;
            return;
        }

        productosFiltrados.forEach((producto) => {
            const card = createProductCard(producto);
            productsListContainer.appendChild(card);
        });
    };

    function createProductCard(producto) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.id = producto.id;

        let precioTexto = formatPrice(producto.precio);
        if (producto.tipoPrecio === 'kg') {
            precioTexto += '/kg';
        }

        const categoriasTexto = producto.categoria && Array.isArray(producto.categoria) && producto.categoria.length > 0 ?
            producto.categoria.join(', ') : 'Sin categoría';

        const imagenHTML = `
                    <img src="${producto.imagen || ''}" alt="${producto.nombre}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <i class="fas fa-image product-image-fallback"></i>
                `;

        card.innerHTML = `
                    <div class="product-image">
                        ${imagenHTML}
                    </div>
                    <div class="product-info">
                        <span class="product-category">${categoriasTexto}</span>
                        <h3 class="product-name">${producto.nombre}</h3>
                        <div class="product-price">${precioTexto}</div>
                    </div>
                `;
        card.addEventListener('click', () => openEditProductModal(producto.id));
        return card;
    }

    const renderCategoriesInManageModal = () => {
        if (!manageCategoriesListElement) return;
        manageCategoriesListElement.innerHTML = '';
        if (categorias.length === 0) {
            manageCategoriesListElement.innerHTML = '<li>No hay categorías definidas.</li>';
            return;
        }
        categorias.forEach(cat => {
            const li = document.createElement('li');
            li.className = 'category-item';
            li.innerHTML = `
                        <span>${cat}</span>
                        <i class="fas fa-trash-alt delete-category-btn" data-category="${cat}" title="Eliminar categoría ${cat}"></i>
                    `;
            li.querySelector('.delete-category-btn').addEventListener('click', handleDeleteCategory);
            manageCategoriesListElement.appendChild(li);
        });
    };

    // --- NUEVA FUNCIÓN PARA RENDERIZAR FILTROS ---
    const renderCategoryFilters = () => {
        if (!filtersContainer) return;
        filtersContainer.innerHTML = '';

        // Botón "Todas"
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn active';
        allBtn.textContent = 'Todas';
        allBtn.dataset.category = 'all';
        filtersContainer.appendChild(allBtn);

        // Botones para cada categoría
        categorias.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.textContent = cat;
            btn.dataset.category = cat;
            filtersContainer.appendChild(btn);
        });

        // Añadir listeners
        filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Actualizar estado activo
                filtersContainer.querySelector('.active').classList.remove('active');
                btn.classList.add('active');
                // Actualizar filtro y renderizar
                currentCategoryFilter = btn.dataset.category;
                renderProducts();
            });
        });
    };

    // MANEJO DE MODALES Y LÓGICA DE IMÁGENES...
    const openModal = (modalElement) => modalElement.classList.add('show');
    const closeModal = (modalElement) => modalElement.classList.remove('show');

    const handleImageUpload = (file, previewElement, urlInputElement, fileInputElement) => {
        if (!previewElement || !urlInputElement || !fileInputElement) return;
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const MAX_WIDTH = 800, MAX_HEIGHT = 800;
                    let { width, height } = img;
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
                    urlInputElement.value = dataUrl;
                    previewElement.innerHTML = `<img src="${dataUrl}" alt="Vista previa"><button type="button" class="image-remove-btn"><i class="fas fa-times"></i></button>`;
                    previewElement.querySelector('.image-remove-btn').addEventListener('click', (event) => {
                        event.stopPropagation();
                        resetImagePreview(previewElement, urlInputElement, fileInputElement);
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            showToast('Por favor, selecciona un archivo de imagen válido.', 'error');
            resetImagePreview(previewElement, urlInputElement, fileInputElement);
        }
    };
    const resetImagePreview = (previewElement, urlInputElement, fileInputElement) => {
        if (!previewElement || !urlInputElement || !fileInputElement) return;
        previewElement.innerHTML = `<div class="image-preview-placeholder"><i class="fas fa-camera"></i><span>Añadir foto</span></div>`;
        urlInputElement.value = '';
        fileInputElement.value = '';
    };
    if (addImagePreview) addImagePreview.addEventListener('click', () => addImageFileInput.click());
    if (addImageFileInput) addImageFileInput.addEventListener('change', (e) => handleImageUpload(e.target.files[0], addImagePreview, addProductImageUrlInput, addImageFileInput));
    if (editImagePreview) editImagePreview.addEventListener('click', () => editImageFileInput.click());
    if (editImageFileInput) editImageFileInput.addEventListener('change', (e) => handleImageUpload(e.target.files[0], editImagePreview, editProductImageUrlInput, editImageFileInput));

    // LÓGICA DE TAGS... (sin cambios)
    const setupTagInput = (inputElement, menuElement, containerElement) => {
        if (!inputElement || !menuElement || !containerElement) return;
        inputElement.addEventListener('input', () => {
            const searchText = inputElement.value.toLowerCase().trim();
            menuElement.innerHTML = '';
            if (!searchText) { menuElement.classList.remove('show'); return; }
            const matchingCategories = categorias.filter(cat => cat.toLowerCase().includes(searchText));
            matchingCategories.forEach(cat => {
                const option = document.createElement('div');
                option.className = 'tag-option';
                option.textContent = cat;
                option.addEventListener('click', () => addTagToForm(cat, containerElement, inputElement, menuElement));
                menuElement.appendChild(option);
            });
            const currentInputText = inputElement.value.trim();
            if (currentInputText && !matchingCategories.some(cat => cat.toLowerCase() === currentInputText.toLowerCase())) {
                const addNewOption = document.createElement('div');
                addNewOption.className = 'tag-option';
                addNewOption.innerHTML = `<i>Añadir nueva:</i> "${currentInputText}"`;
                addNewOption.addEventListener('click', () => {
                    if (currentInputText) {
                        addTagToForm(currentInputText, containerElement, inputElement, menuElement);
                        if (!categorias.includes(currentInputText)) { categorias.push(currentInputText); categorias.sort(); saveAppData(); }
                    }
                });
                menuElement.appendChild(addNewOption);
            }
            menuElement.classList.toggle('show', menuElement.hasChildNodes());
        });
        inputElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const newCatName = inputElement.value.trim();
                if (newCatName) {
                    addTagToForm(newCatName, containerElement, inputElement, menuElement);
                    if (!categorias.includes(newCatName)) { categorias.push(newCatName); categorias.sort(); saveAppData(); }
                }
            }
        });
        document.addEventListener('click', (e) => {
            if (menuElement && !menuElement.contains(e.target) && e.target !== inputElement) { menuElement.classList.remove('show'); }
        });
    };
    const addTagToForm = (categoryName, container, input, menu) => {
        const categoryCleanName = categoryName.trim();
        if (!categoryCleanName) return;
        const existingTags = Array.from(container.querySelectorAll('.tag > span:first-child')).map(span => span.textContent.trim());
        if (existingTags.includes(categoryCleanName)) { if (input) input.value = ''; if (menu) menu.classList.remove('show'); return; }
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.dataset.categoryName = categoryCleanName;
        tagElement.innerHTML = `<span>${categoryCleanName}</span><span class="remove-tag">×</span>`;
        tagElement.querySelector('.remove-tag').addEventListener('click', (e) => { e.stopPropagation(); tagElement.remove(); });
        container.appendChild(tagElement);
        if (input) input.value = '';
        if (menu) menu.classList.remove('show');
        if (input) input.focus();
    };
    const getSelectedTagsFromForm = (container) => Array.from(container.querySelectorAll('.tag > span:first-child')).map(span => span.textContent.trim());
    const loadTagsToForm = (productCategories, container, input, menu) => {
        if (!container) return;
        container.innerHTML = '';
        if (productCategories && Array.isArray(productCategories) && productCategories.length > 0) {
            productCategories.forEach(cat => addTagToForm(cat, container, input, menu));
        }
    };
    setupTagInput(addTagInput, addTagsMenu, addTagsContainer);
    setupTagInput(editTagInput, editTagsMenu, editTagsContainer);

    // FUNCIONALIDAD DE PRODUCTOS (AÑADIR, EDITAR, BORRAR)... (sin cambios significativos en la lógica interna)
    const openAddProductModal = () => {
        if (!addProductForm) return;
        addProductForm.reset();
        resetImagePreview(addImagePreview, addProductImageUrlInput, addImageFileInput);
        if (addTagsContainer) addTagsContainer.innerHTML = '';
        if (continueAddingCheckbox) continueAddingCheckbox.checked = false;
        currentEditingProductId = null;
        openModal(addProductModalElement);
        if (addProductNameInput) addProductNameInput.focus();
    };
    if (addSaveBtn) addSaveBtn.addEventListener('click', () => {
        if (!addProductNameInput || !addProductPriceInput) return;
        const nombre = addProductNameInput.value.trim();
        const precio = parseFloat(addProductPriceInput.value);
        const tipoPrecioRadio = document.querySelector('input[name="add-price-type"]:checked');
        if (!tipoPrecioRadio) { showToast('Por favor, selecciona un tipo de precio.', 'error'); return; }
        const tipoPrecio = tipoPrecioRadio.value;
        const formCategorias = getSelectedTagsFromForm(addTagsContainer);
        if (!nombre || isNaN(precio) || precio <= 0) { showToast('Nombre y precio ($) válido son requeridos.', 'error'); return; }
        const newProduct = { id: generateId(), nombre, precio, imagen: addProductImageUrlInput ? addProductImageUrlInput.value : "", categoria: formCategorias, tipoPrecio };
        productos.unshift(newProduct);
        formCategorias.forEach(cat => { if (!categorias.includes(cat)) categorias.push(cat); });
        categorias.sort();
        saveAppData();
        renderProducts();
        renderCategoryFilters(); // Actualizar filtros por si hay nueva categoría
        showToast('Producto añadido con éxito.', 'success');
        if (continueAddingCheckbox && continueAddingCheckbox.checked) {
            addProductForm.reset();
            resetImagePreview(addImagePreview, addProductImageUrlInput, addImageFileInput);
            if (addTagsContainer) addTagsContainer.innerHTML = '';
            continueAddingCheckbox.checked = true;
            if (addProductNameInput) addProductNameInput.focus();
        } else {
            closeModal(addProductModalElement);
        }
    });
    const openEditProductModal = (productId) => {
        if (!editProductForm) return;
        const product = productos.find(p => p.id === productId);
        if (!product) { showToast('Producto no encontrado.', 'error'); return; }
        currentEditingProductId = productId;
        editProductForm.reset();
        if (editProductIdInput) editProductIdInput.value = product.id;
        if (editProductNameInput) editProductNameInput.value = product.nombre;
        if (editProductPriceInput) editProductPriceInput.value = product.precio;
        const typeRadio = document.querySelector(`input[name="edit-price-type"][value="${product.tipoPrecio}"]`);
        if (typeRadio) typeRadio.checked = true;
        if (product.imagen) {
            const imageUrl = product.imagen;
            editProductImageUrlInput.value = imageUrl;
            editImagePreview.innerHTML = `<img src="${imageUrl}" alt="Vista previa"><button type="button" class="image-remove-btn"><i class="fas fa-times"></i></button>`;
            editImagePreview.querySelector('.image-remove-btn').addEventListener('click', (event) => {
                event.stopPropagation();
                resetImagePreview(editImagePreview, editProductImageUrlInput, editImageFileInput);
            });
        } else {
            resetImagePreview(editImagePreview, editProductImageUrlInput, editImageFileInput);
        }
        loadTagsToForm(product.categoria, editTagsContainer, editTagInput, editTagsMenu);
        openModal(editProductModalElement);
        if (editProductNameInput) editProductNameInput.focus();
    };
    if (editSaveBtn) editSaveBtn.addEventListener('click', () => {
        if (!currentEditingProductId || !editProductNameInput || !editProductPriceInput) return;
        const nombre = editProductNameInput.value.trim();
        const precio = parseFloat(editProductPriceInput.value);
        const tipoPrecioRadio = document.querySelector('input[name="edit-price-type"]:checked');
        if (!tipoPrecioRadio) { showToast('Por favor, selecciona un tipo de precio.', 'error'); return; }
        const tipoPrecio = tipoPrecioRadio.value;
        const formCategorias = getSelectedTagsFromForm(editTagsContainer);
        if (!nombre || isNaN(precio) || precio <= 0) { showToast('Nombre y precio ($) válido son requeridos.', 'error'); return; }
        const productIndex = productos.findIndex(p => p.id === currentEditingProductId);
        if (productIndex !== -1) {
            productos[productIndex] = { ...productos[productIndex], nombre, precio, tipoPrecio, imagen: editProductImageUrlInput ? editProductImageUrlInput.value : "", categoria: formCategorias };
            formCategorias.forEach(cat => { if (!categorias.includes(cat)) categorias.push(cat); });
            categorias.sort();
            saveAppData();
            renderProducts();
            renderCategoryFilters(); // Actualizar filtros
            closeModal(editProductModalElement);
            showToast('Producto actualizado con éxito.', 'success');
        } else { showToast('Error al actualizar el producto.', 'error'); }
    });
    if (deleteProductBtn) deleteProductBtn.addEventListener('click', () => {
        if (!currentEditingProductId) return;
        if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            productos = productos.filter(p => p.id !== currentEditingProductId);
            saveAppData();
            renderProducts();
            closeModal(editProductModalElement);
            showToast('Producto eliminado.', 'success');
            currentEditingProductId = null;
        }
    });

    // FUNCIONALIDAD DE CATEGORÍAS (Modal de Gestión)... (sin cambios)
    const openCategoriesManageModal = () => { renderCategoriesInManageModal(); if (newCategoryInput) newCategoryInput.value = ''; openModal(categoriesModalElement); if (newCategoryInput) newCategoryInput.focus(); };
    if (addNewCategoryBtn) addNewCategoryBtn.addEventListener('click', () => {
        if (!newCategoryInput) return;
        const newCatName = newCategoryInput.value.trim();
        if (newCatName) {
            if (!categorias.includes(newCatName)) { categorias.push(newCatName); categorias.sort(); saveAppData(); renderCategoriesInManageModal(); newCategoryInput.value = ''; showToast(`Categoría "${newCatName}" añadida.`, 'success'); newCategoryInput.focus(); } else { showToast('Esa categoría ya existe.', 'error'); }
        } else { showToast('Ingresa un nombre para la categoría.', 'error'); }
    });
    if (newCategoryInput) newCategoryInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (addNewCategoryBtn) addNewCategoryBtn.click(); } });
    function handleDeleteCategory(event) {
        const catToDelete = event.target.dataset.category;
        if (confirm(`¿Seguro que quieres eliminar la categoría "${catToDelete}"? Se quitará de todos los productos.`)) {
            categorias = categorias.filter(cat => cat !== catToDelete);
            productos.forEach(product => { if (product.categoria && Array.isArray(product.categoria) && product.categoria.includes(catToDelete)) { product.categoria = product.categoria.filter(pc => pc !== catToDelete); } });
            saveAppData();
            renderCategoriesInManageModal();
            renderProducts();
            renderCategoryFilters(); // Actualizar filtros
            showToast(`Categoría "${catToDelete}" eliminada.`, 'info');
        }
    }

    // FUNCIONALIDAD DE CONFIGURACIÓN
    const openSettingsModal = () => {
        const currentViewModeRadio = document.querySelector(`input[name="product-view-mode"][value="${appConfig.productViewMode}"]`);
        if (currentViewModeRadio) currentViewModeRadio.checked = true;
        const currentImageViewRadio = document.querySelector(`input[name="product-image-view"][value="${appConfig.productImageView}"]`);
        if (currentImageViewRadio) currentImageViewRadio.checked = true;
        if (themeToggleCheckbox) { themeToggleCheckbox.checked = (appConfig.theme === 'dark'); }
        openModal(settingsModalElement);
    };
    if (productViewModeRadios) productViewModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            appConfig.productViewMode = e.target.value;
            applyProductViewMode();
            saveAppData();
            showToast(`Vista cambiada a ${e.target.value === 'grid' ? 'cuadrícula' : 'lista'}.`, 'info');
        });
    });
    const productImageViewRadios = document.querySelectorAll('input[name="product-image-view"]');
    if (productImageViewRadios) productImageViewRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            appConfig.productImageView = e.target.value;
            applyImageViewMode();
            saveAppData();
            showToast(`Ajuste de imagen cambiado a ${e.target.value === 'cover' ? 'Rellenar' : 'Ajustar'}.`, 'info');
        });
    });

    // Lógica de exportar/importar/borrar datos (sin cambios)...
    if (exportDataBtn) exportDataBtn.addEventListener('click', () => { /* ... */ });
    if (importDataFileInput) importDataFileInput.addEventListener('change', (event) => { /* ... */ });
    if (clearAllDataBtn) clearAllDataBtn.addEventListener('click', () => { /* ... */ });

    // --- LISTENERS PARA NUEVOS ELEMENTOS ---
    if (viewModeBtn) viewModeBtn.addEventListener('click', () => {
        appConfig.productViewMode = appConfig.productViewMode === 'grid' ? 'list' : 'grid';
        applyProductViewMode();
        saveAppData();
    });
    if (toggleFiltersBtn) toggleFiltersBtn.addEventListener('click', () => {
        filtersContainer.classList.toggle('visible');
    });
    if (sortSelect) sortSelect.addEventListener('change', (e) => {
        currentSortOrder = e.target.value;
        renderProducts();
    });

    // BÚSQUEDA (ahora solo llama a renderProducts)
    if (searchInput) searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        clearSearchBtn.classList.toggle('visible', searchTerm.length > 0);
        renderProducts(); // La lógica de filtrado ya está dentro
    });

    if (clearSearchBtn) clearSearchBtn.addEventListener('click', () => {
        if (searchInput) { searchInput.value = ''; searchInput.focus(); }
        clearSearchBtn.classList.remove('visible');
        renderProducts();
    });

    // NAVEGACIÓN Y EVENT LISTENERS GENERALES
    const allNavItems = [navHomeBtn, navCategoriesBtn, navAddBtn, navSettingsBtn].filter(Boolean);
    const setActiveNav = (activeBtn) => {
        allNavItems.forEach(btn => btn.classList.remove('active'));
        if (activeBtn) activeBtn.classList.add('active');
    };
    if (navHomeBtn) navHomeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveNav(navHomeBtn);
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.classList.remove('visible');
        currentCategoryFilter = 'all';
        currentSortOrder = 'default';
        sortSelect.value = 'default';
        renderCategoryFilters();
        renderProducts();
        if (productsListContainer) productsListContainer.scrollTop = 0;
    });
    if (navCategoriesBtn) navCategoriesBtn.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(navCategoriesBtn); openCategoriesManageModal(); });
    if (navAddBtn) navAddBtn.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(navAddBtn); openAddProductModal(); });
    if (fabAddProductBtn) fabAddProductBtn.addEventListener('click', () => { if (navAddBtn && !navAddBtn.classList.contains('active')) { setActiveNav(navAddBtn); } openAddProductModal(); });
    if (navSettingsBtn) { navSettingsBtn.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(navSettingsBtn); openSettingsModal(); }); }
    [{ btn: closeAddModalBtn, modal: addProductModalElement }, { btn: addCancelBtn, modal: addProductModalElement }, { btn: closeEditModalBtn, modal: editProductModalElement }, { btn: editCancelBtn, modal: editProductModalElement }, { btn: closeCategoriesModalBtn, modal: categoriesModalElement }, { btn: categoriesDoneBtn, modal: categoriesModalElement }, { btn: closeSettingsModalBtn, modal: settingsModalElement }, { btn: settingsDoneBtn, modal: settingsModalElement }].forEach(item => { if (item.btn) item.btn.addEventListener('click', () => closeModal(item.modal)); });
    [addProductModalElement, editProductModalElement, categoriesModalElement, settingsModalElement].forEach(modal => { if (modal) { modal.addEventListener('click', (event) => { if (event.target === modal) { closeModal(modal); } }); } });

    // --- INICIALIZACIÓN ---
    const initApp = () => {
        loadAppData();
        renderCategoryFilters(); // Renderizar filtros al inicio
        renderProducts();
        setActiveNav(navHomeBtn);
    };

    // Listener para el botón "Cargar de Galería" en el modal de añadir
    if (addUploadBtn) addUploadBtn.addEventListener('click', () => {
        // Quita el atributo capture para abrir la galería
        addImageFileInput.removeAttribute('capture');
        addImageFileInput.click();
    });

    // Listener para el botón "Tomar Foto" en el modal de añadir
    if (addCameraBtn) addCameraBtn.addEventListener('click', () => {
        // Añade el atributo capture para abrir la cámara
        addImageFileInput.setAttribute('capture', 'environment');
        addImageFileInput.click();
    });

    // Listener para el botón "Cargar de Galería" en el modal de edición
    if (editUploadBtn) editUploadBtn.addEventListener('click', () => {
        // Quita el atributo capture para abrir la galería
        editImageFileInput.removeAttribute('capture');
        editImageFileInput.click();
    });

    // Listener para el botón "Tomar Foto" en el modal de edición
    if (editCameraBtn) editCameraBtn.addEventListener('click', () => {
        // Añade el atributo capture para abrir la cámara
        editImageFileInput.setAttribute('capture', 'environment');
        editImageFileInput.click();
    });

    // Listener para el botón de exportar datos
    document.addEventListener('DOMContentLoaded', () => {
        // Busca el botón por su ID
        const exportBtn = document.getElementById('export-data-btn');

        exportBtn.addEventListener('click', () => {
            // Aquí usamos la variable 'productos' directamente, que es visible en este ámbito.
            if (productos && Array.isArray(productos)) {
                exportData(productos);
            } else {
                showToast('No hay datos para exportar.', 'error');
            }
        });
    });

    function exportData(data) {
        if (!data || data.length === 0) {
            showToast('No hay datos para exportar.', 'info');
            return;
        }

        // Convierte el array de productos a una cadena JSON con formato legible
        const jsonData = JSON.stringify(data, null, 2);

        // Crea un Blob (objeto de archivo) con el contenido JSON
        const blob = new Blob([jsonData], { type: 'application/json' });

        // Crea un URL para el Blob
        const url = URL.createObjectURL(blob);

        // Crea un enlace temporal para la descarga
        const link = document.createElement('a');
        link.href = url;
        link.download = 'catalogo-productos.json';

        // Simula un clic para iniciar la descarga
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Libera el objeto URL
        URL.revokeObjectURL(url);

        showToast('Datos exportados correctamente.', 'success');
    }

    initApp();
});

