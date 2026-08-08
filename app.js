document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Set current date
    const dateElement = document.getElementById('current-time');
    if (dateElement) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateElement.textContent = `${yyyy}-${mm}-${dd}`;
    }

    // Initialize Toast Notification
    window.showToast = function(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-msg toast-${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'danger') iconName = 'alert-triangle';
        
        toast.innerHTML = `
            <i data-lucide="${iconName}" style="width: 16px; height: 16px;"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ attrs: { class: 'lucide-toast-icon' } });
        }

        // Auto remove
        setTimeout(() => {
            toast.remove();
        }, 3000);
    };

    // 2. Tab Navigation
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const targetContent = document.getElementById(`tab-${target}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Trigger chart update if resizing issues occur on hidden tabs
            if (target === 'analytics') {
                setTimeout(updateCharts, 50);
            }

            // Trigger canvas redraw when thumbnail tab is clicked
            if (target === 'thumbnail') {
                setTimeout(updateStudioCanvas, 50);
            }
        });
    });


    /* ==========================================================================
       [Tab 1] SEO Keyword Title Combiner Logic
       ========================================================================== */
    const brandInput = document.getElementById('input-brand');
    const mainInput = document.getElementById('input-main');
    const subInput = document.getElementById('input-sub');
    const propsInput = document.getElementById('input-props');
    const btnGenerate = document.getElementById('btn-generate-title');
    const dedupCheck = document.getElementById('check-dedup');
    const specialCheck = document.getElementById('check-special');
    const selectTemplate = document.getElementById('select-template');
    
    const resultContainer = document.getElementById('result-container');
    const keywordEmptyState = document.getElementById('keyword-empty-state');
    const resultActions = document.getElementById('result-actions');
    const btnCopyAll = document.getElementById('btn-copy-all');
    const btnExportTxt = document.getElementById('btn-export-txt');

    const gaugeFill = document.getElementById('seo-gauge-fill');
    const gaugeStatus = document.getElementById('seo-gauge-status');

    // Preset tag injection
    window.setKeywordPreset = function(field, value) {
        if (field === 'brand') brandInput.value = value;
        if (field === 'main') mainInput.value = value;
        if (field === 'sub') subInput.value = value;
        if (field === 'props') propsInput.value = value;
        
        showToast('프리셋 키워드가 삽입되었습니다.', 'success');
        updateSeoGauge();
    };

    // Clean String Utility
    function cleanKeywordString(str, removeSpecial) {
        if (!str) return '';
        let cleaned = str;
        if (removeSpecial) {
            // Remove typical special characters but keep spaces and commas
            cleaned = cleaned.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣\s,]/g, ' ');
        }
        return cleaned;
    }

    // Title combination algorithm
    function generateTitles() {
        const brand = brandInput.value.trim();
        const main = mainInput.value.trim();
        const subRaw = subInput.value.trim();
        const propsRaw = propsInput.value.trim();

        if (!main) {
            showToast('메인 키워드는 필수 입력 사항입니다.', 'danger');
            mainInput.focus();
            return;
        }

        const isDedup = dedupCheck.checked;
        const isCleanSpecial = specialCheck.checked;

        // Clean inputs
        const cleanBrand = cleanKeywordString(brand, isCleanSpecial);
        const cleanMain = cleanKeywordString(main, isCleanSpecial);
        
        // Parse sub keywords and properties (split by comma or space)
        let subList = subRaw.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0);
        let propsList = propsRaw.split(/[,\n]/).map(p => p.trim()).filter(p => p.length > 0);

        if (isCleanSpecial) {
            subList = subList.map(s => cleanKeywordString(s, true));
            propsList = propsList.map(p => cleanKeywordString(p, true));
        }

        // Templates rendering
        const template = selectTemplate.value;
        let combinations = [];

        if (template === 'standard') {
            // Brand + Main + Properties + Sub Keywords
            combinations.push(assembleTitle(cleanBrand, cleanMain, propsList, subList));
            // Alternative: Main + Brand + Properties + Sub Keywords
            combinations.push(assembleTitle(cleanMain, cleanBrand, propsList, subList));
            // Alternative: Brand + Properties + Main + Sub Keywords
            combinations.push(assembleTitle(cleanBrand, propsList, cleanMain, subList));
        } else if (template === 'brand-last') {
            // Main + Properties + Sub Keywords + Brand
            combinations.push(assembleTitle(cleanMain, propsList, subList, cleanBrand));
            // Alternative: Properties + Main + Sub Keywords + Brand
            combinations.push(assembleTitle(propsList, cleanMain, subList, cleanBrand));
            // Alternative: Main + Sub Keywords + Properties + Brand
            combinations.push(assembleTitle(cleanMain, subList, propsList, cleanBrand));
        } else if (template === 'keyword-only') {
            // Main + Sub Keywords + Properties
            combinations.push(assembleTitle(cleanMain, subList, propsList, ''));
            // Alternative: Sub Keywords + Main + Properties
            combinations.push(assembleTitle(subList, cleanMain, propsList, ''));
            // Alternative: Main + Properties + Sub Keywords (without Brand)
            combinations.push(assembleTitle(cleanMain, propsList, subList, ''));
        }

        // Render Results
        renderResults(combinations);
        updateSeoGauge(combinations[0]);
    }

    function assembleTitle(...parts) {
        // Flatten arrays and join elements with spaces
        let elements = [];
        parts.forEach(part => {
            if (Array.isArray(part)) {
                elements.push(...part);
            } else if (part) {
                elements.push(part);
            }
        });

        // Split into words, remove empty items
        let words = elements.flatMap(el => el.split(/\s+/)).filter(w => w.length > 0);

        // Remove duplicate words if enabled
        if (dedupCheck.checked) {
            words = [...new Set(words)];
        }

        return words.join(' ');
    }

    function renderResults(combinations) {
        resultContainer.innerHTML = '';
        keywordEmptyState.style.display = 'none';
        resultContainer.style.display = 'flex';
        resultActions.style.display = 'block';

        combinations.forEach((title, index) => {
            const charCount = title.length;
            const byteCount = getByteLength(title);
            const wordCount = title.split(/\s+/).filter(w => w.length > 0).length;

            const isBest = index === 0;
            const badgeText = isBest ? '추천 최적 조합' : `대안 조합 ${index}`;
            
            // SEO score evaluation
            let seoStatus = '양호';
            let seoClass = 'success-text';
            if (charCount < 25) {
                seoStatus = '길이 미달 (25자 이상 권장)';
                seoClass = 'danger-text';
            } else if (charCount > 50) {
                seoStatus = '길이 초과 (50자 이하 권장)';
                seoClass = 'danger-text';
            }

            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <div class="result-header">
                    <span class="result-badge" style="${isBest ? '' : 'background-color: var(--bg-tertiary); color: var(--text-secondary);'}">${badgeText}</span>
                    <span class="result-stats">
                        <span class="stat-badge">단어수: ${wordCount}개</span>
                        <span class="stat-badge">바이트: ${byteCount}B</span>
                    </span>
                </div>
                <div class="result-title" id="title-text-${index}">${title}</div>
                <div class="result-footer">
                    <span class="stat-badge ${seoClass}">${charCount}자 · ${seoStatus}</span>
                    <button class="btn btn-secondary btn-sm" onclick="copyTitleText(${index})">
                        <i data-lucide="copy" style="width: 12px; height: 12px;"></i> 복사하기
                    </button>
                </div>
            `;
            resultContainer.appendChild(card);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Get byte length of string (EUC-KR or typical Korean byte calc: Korean 2 bytes, English 1 byte)
    function getByteLength(s) {
        let b = 0;
        for (let i = 0; i < s.length; i++) {
            const c = s.charCodeAt(i);
            b += (c >> 11) ? 3 : ((c >> 7) ? 2 : 1); // rough UTF-8 byte estimate, let's use standard EUC-KR style: Korean = 2, English = 1
        }
        
        let eucKrByte = 0;
        for (let i = 0; i < s.length; i++) {
            const charCode = s.charCodeAt(i);
            if (charCode > 127) {
                eucKrByte += 2;
            } else {
                eucKrByte += 1;
            }
        }
        return eucKrByte;
    }

    window.copyTitleText = function(index) {
        const text = document.getElementById(`title-text-${index}`).textContent;
        navigator.clipboard.writeText(text).then(() => {
            showToast('클립보드에 상품명이 복사되었습니다.', 'success');
        }).catch(err => {
            showToast('복사에 실패했습니다.', 'danger');
        });
    };

    // Realtime Gauge Update on Type
    function updateSeoGauge(specificTitle) {
        let title = specificTitle;
        if (!title) {
            // Build temporary title based on standard template
            const brand = brandInput.value.trim();
            const main = mainInput.value.trim();
            const subRaw = subInput.value.trim();
            const propsRaw = propsInput.value.trim();
            
            let subList = subRaw.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0);
            let propsList = propsRaw.split(/[,\n]/).map(p => p.trim()).filter(p => p.length > 0);
            
            title = assembleTitle(brand, main, propsList, subList);
        }

        const len = title.length;
        // Gauge scaling: 50 characters represents 100% of the gauge width, capped at 100% (or let it expand to 120%)
        const maxDisplayLen = 60;
        const percentage = Math.min((len / maxDisplayLen) * 100, 100);
        
        gaugeFill.style.width = `${percentage}%`;

        // Update colors and warnings
        if (len === 0) {
            gaugeFill.style.background = 'var(--text-muted)';
            gaugeStatus.textContent = '키워드를 입력해 주세요';
            gaugeStatus.style.color = 'var(--text-muted)';
        } else if (len < 25) {
            gaugeFill.style.background = 'linear-gradient(to right, var(--color-danger), #f59e0b)';
            gaugeStatus.textContent = `${len}자 - 길이 부족 (최소 25자 권장)`;
            gaugeStatus.style.color = 'var(--color-danger)';
        } else if (len <= 50) {
            gaugeFill.style.background = 'var(--color-naver)';
            gaugeStatus.textContent = `${len}자 - 최적의 검색 최적화 상태`;
            gaugeStatus.style.color = 'var(--color-naver)';
        } else {
            gaugeFill.style.background = 'var(--color-danger)';
            gaugeStatus.textContent = `${len}자 - 길이 초과 (최대 50자 권장)`;
            gaugeStatus.style.color = 'var(--color-danger)';
        }
    }

    // Wire listeners
    [brandInput, mainInput, subInput, propsInput, dedupCheck, specialCheck, selectTemplate].forEach(el => {
        el.addEventListener('input', () => updateSeoGauge());
    });

    btnGenerate.addEventListener('click', generateTitles);

    btnCopyAll.addEventListener('click', () => {
        const firstTitle = document.getElementById('title-text-0');
        if (firstTitle) {
            navigator.clipboard.writeText(firstTitle.textContent).then(() => {
                showToast('최적 조합 상품명이 복사되었습니다.', 'success');
            });
        }
    });

    btnExportTxt.addEventListener('click', () => {
        const cards = resultContainer.querySelectorAll('.result-title');
        if (cards.length === 0) return;
        
        let textContent = "SmartStore All-in-One 키워드 조합기 내보내기 결과\r\n";
        textContent += "생성일자: " + new Date().toLocaleString() + "\r\n";
        textContent += "==================================================\r\n\r\n";
        
        cards.forEach((card, idx) => {
            textContent += `[조합 ${idx === 0 ? '최적' : idx}] ${card.textContent}\r\n`;
        });

        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `smartstore-seo-titles-${Date.now()}.txt`;
        link.click();
        showToast('텍스트 파일이 생성되어 다운로드되었습니다.', 'success');
    });


    /* ==========================================================================
       [Tab 2] AI Product Thumbnail Studio Logic
       ========================================================================== */
    const thumbDropZone = document.getElementById('thumbnail-drop-zone');
    const thumbFileInput = document.getElementById('thumbnail-file-input');
    const uploadSuccessBadge = document.getElementById('upload-success-badge');
    const uploadedFilename = document.getElementById('uploaded-filename');
    const btnRemoveThumb = document.getElementById('btn-remove-thumb');

    const studioCanvas = document.getElementById('studioCanvas');
    const btnNooki = document.getElementById('btn-nooki');
    const inputSashText = document.getElementById('input-sash-text');
    const badgeSelectBtns = document.querySelectorAll('.badge-select-btn');
    const btnFlipH = document.getElementById('btn-flip-h');
    const studioBgSelect = document.getElementById('studio-bg-select');

    let originalImgDataUrl = '';
    let currentBadgeText = '';
    let isFlippedH = false;
    let studioImg = new Image(); // Drawing source

    const btnResetThumbnail = document.getElementById('btn-reset-thumbnail');
    const btnDownloadThumbnail = document.getElementById('btn-download-thumbnail');

    // Slider Controls
    const shadowBlur = document.getElementById('range-shadow-blur');
    const shadowOpacity = document.getElementById('range-shadow-opacity');
    const shadowY = document.getElementById('range-shadow-y');
    
    const productScale = document.getElementById('range-product-scale');
    const productPosX = document.getElementById('range-product-pos-x');
    const productPosY = document.getElementById('range-product-pos-y');
    const productRotate = document.getElementById('range-product-rotate');

    // Values labels
    const valShadowBlur = document.getElementById('val-shadow-blur');
    const valShadowOpacity = document.getElementById('val-shadow-opacity');
    const valShadowY = document.getElementById('val-shadow-y');
    
    const valProductScale = document.getElementById('val-product-scale');
    const valProductPosX = document.getElementById('val-product-pos-x');
    const valProductPosY = document.getElementById('val-product-pos-y');
    const valProductRotate = document.getElementById('val-product-rotate');

    let backgroundMode = 'preset'; // 'preset' or 'ai'
    let aiBgImage = null;
    
    const inputAiPrompt = document.getElementById('input-ai-prompt');
    const btnGenerateAiBg = document.getElementById('btn-generate-ai-bg');
    // Local adjustment controls
    const rangeProductBrightness = document.getElementById('range-product-brightness');
    const valProductBrightness = document.getElementById('val-product-brightness');
    const rangeProductContrast = document.getElementById('range-product-contrast');
    const valProductContrast = document.getElementById('val-product-contrast');
    const rangeProductSaturation = document.getElementById('range-product-saturation');
    const valProductSaturation = document.getElementById('val-product-saturation');

    thumbDropZone.addEventListener('click', () => thumbFileInput.click());
    
    thumbDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        thumbDropZone.classList.add('dragover');
    });

    thumbDropZone.addEventListener('dragleave', () => {
        thumbDropZone.classList.remove('dragover');
    });

    thumbDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        thumbDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleUploadedImage(e.dataTransfer.files[0]);
        }
    });

    thumbFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleUploadedImage(e.target.files[0]);
        }
    });

    function handleUploadedImage(file) {
        if (!file.type.startsWith('image/')) {
            showToast('이미지 파일만 업로드할 수 있습니다.', 'danger');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            originalImgDataUrl = e.target.result;
            
            studioImg = new Image();
            studioImg.onload = () => {
                // Reset placement to defaults
                productScale.value = 1.0;
                productPosX.value = 0;
                productPosY.value = 0;
                productRotate.value = 0;
                isFlippedH = false;
                
                // Reset adjustments to defaults
                rangeProductBrightness.value = 100;
                rangeProductContrast.value = 100;
                rangeProductSaturation.value = 100;
                
                shadowBlur.value = 20;
                shadowOpacity.value = 0.3;
                shadowY.value = 15;

                // Sync labels text
                valProductScale.textContent = '1.0';
                valProductPosX.textContent = '0';
                valProductPosY.textContent = '0';
                valProductRotate.textContent = '0°';
                valProductBrightness.textContent = '100%';
                valProductContrast.textContent = '100%';
                valProductSaturation.textContent = '100%';
                valShadowBlur.textContent = '20px';
                valShadowOpacity.textContent = '0.3';
                valShadowY.textContent = '15px';

                btnNooki.style.display = 'inline-flex';
                uploadedFilename.textContent = file.name;
                uploadSuccessBadge.style.display = 'inline-flex';
                btnDownloadThumbnail.disabled = false;
                
                updateStudioCanvas();
                showToast('상품 이미지가 에디터에 업로드되었습니다.', 'success');
            };
            studioImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    btnRemoveThumb.addEventListener('click', (e) => {
        e.stopPropagation();
        originalImgDataUrl = '';
        studioImg = new Image();
        btnNooki.style.display = 'none';
        uploadSuccessBadge.style.display = 'none';
        thumbFileInput.value = '';
        btnDownloadThumbnail.disabled = true;
        updateStudioCanvas();
        showToast('업로드된 이미지가 제거되었습니다.', 'info');
    });

    // 🪄 흰색 배경 누끼 투명화 (자동)
    btnNooki.addEventListener('click', () => {
        if (!studioImg.src || originalImgDataUrl === '') {
            showToast('누끼를 딸 상품 이미지를 먼저 업로드해 주세요.', 'danger');
            return;
        }

        const tempImg = new Image();
        tempImg.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = tempImg.naturalWidth;
            canvas.height = tempImg.naturalHeight;
            ctx.drawImage(tempImg, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // Simple white threshold nooki keying (R > 215 & G > 215 & B > 215 => alpha = 0)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                if (r > 215 && g > 215 && b > 215) {
                    data[i+3] = 0; // set transparent
                }
            }
            ctx.putImageData(imgData, 0, 0);
            
            // Replace preview source
            studioImg = new Image();
            studioImg.onload = () => {
                updateStudioCanvas();
                showToast('흰색 배경 자동 누끼 처리가 완료되었습니다.', 'success');
            };
            studioImg.src = canvas.toDataURL('image/png');
        };
        tempImg.src = originalImgDataUrl;
    });

    // 배지(Badge) 선택 처리
    badgeSelectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            badgeSelectBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentBadgeText = btn.getAttribute('data-badge');
            updateStudioCanvas();
            
            if (currentBadgeText) {
                showToast(`배지 '${currentBadgeText}'(으)로 적용되었습니다.`, 'info');
            } else {
                showToast('배지가 해제되었습니다.', 'info');
            }
        });
    });

    // 좌우 반전 처리
    btnFlipH.addEventListener('click', () => {
        isFlippedH = !isFlippedH;
        updateStudioCanvas();
        showToast('좌우 반전 상태가 변경되었습니다.', 'info');
    });

    // 하단 띠지 홍보 문구 실시간 반영
    inputSashText.addEventListener('input', () => {
        updateStudioCanvas();
    });

    // 스튜디오 배경 셀렉트 박스 처리
    studioBgSelect.addEventListener('change', () => {
        backgroundMode = 'preset';
        updateStudioCanvas();
        const selectedOpt = studioBgSelect.options[studioBgSelect.selectedIndex].text;
        showToast(`배경 테마가 '${selectedOpt}'(으)로 변경되었습니다.`, 'info');
    });

    // AI Custom Background Generation
    btnGenerateAiBg.addEventListener('click', () => {
        const promptVal = inputAiPrompt.value.trim();
        if (!promptVal) {
            showToast('AI 배경을 생성할 프롬프트 키워드를 입력해 주세요.', 'warning');
            return;
        }

        showToast('AI 배경 이미지를 생성 중입니다. 약 5~8초 소요됩니다...', 'info');
        
        const encodedPrompt = encodeURIComponent(promptVal);
        const seed = Math.floor(Math.random() * 100000);
        const aiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1000&height=1000&seed=${seed}&nologo=true`;
        
        const tempBg = new Image();
        tempBg.crossOrigin = 'anonymous'; // critical to prevent canvas cross-origin security errors on export
        tempBg.onload = () => {
            aiBgImage = tempBg;
            backgroundMode = 'ai';
            updateStudioCanvas();
            showToast('AI 맞춤형 스튜디오 배경 생성이 완료되었습니다.', 'success');
        };
        tempBg.onerror = () => {
            showToast('AI 배경 이미지 생성 중 오류가 발생했습니다. 다시 시도해 주세요.', 'danger');
        };
        tempBg.src = aiUrl;
    });

    // Slider configurations for batch value synchronization and canvas redrawing
    const slidersConfig = [
        { control: shadowBlur, label: valShadowBlur, suffix: 'px' },
        { control: shadowOpacity, label: valShadowOpacity, suffix: '' },
        { control: shadowY, label: valShadowY, suffix: 'px' },
        { control: productScale, label: valProductScale, suffix: '' },
        { control: productPosX, label: valProductPosX, suffix: '' },
        { control: productPosY, label: valProductPosY, suffix: '' },
        { control: productRotate, label: valProductRotate, suffix: '°' },
        { control: rangeProductBrightness, label: valProductBrightness, suffix: '%' },
        { control: rangeProductContrast, label: valProductContrast, suffix: '%' },
        { control: rangeProductSaturation, label: valProductSaturation, suffix: '%' }
    ];

    slidersConfig.forEach(cfg => {
        cfg.control.addEventListener('input', () => {
            cfg.label.textContent = cfg.control.value + cfg.suffix;
            updateStudioCanvas();
        });
    });

    // Reset studio parameters
    btnResetThumbnail.addEventListener('click', () => {
        shadowBlur.value = 20;
        shadowOpacity.value = 0.3;
        shadowY.value = 15;
        productScale.value = 1.0;
        productPosX.value = 0;
        productPosY.value = 0;
        productRotate.value = 0;
        isFlippedH = false;
        
        // Reset image adjustments
        rangeProductBrightness.value = 100;
        rangeProductContrast.value = 100;
        rangeProductSaturation.value = 100;
        
        // Sync labels text
        valShadowBlur.textContent = '20px';
        valShadowOpacity.textContent = '0.3';
        valShadowY.textContent = '15px';
        valProductScale.textContent = '1.0';
        valProductPosX.textContent = '0';
        valProductPosY.textContent = '0';
        valProductRotate.textContent = '0°';
        valProductBrightness.textContent = '100%';
        valProductContrast.textContent = '100%';
        valProductSaturation.textContent = '100%';

        inputAiPrompt.value = '';
        backgroundMode = 'preset';
        aiBgImage = null;
        studioBgSelect.value = 'marble';

        // Reset badge & sash text
        inputSashText.value = '';
        currentBadgeText = '';
        badgeSelectBtns.forEach(b => {
            b.classList.remove('active');
            if (b.getAttribute('data-badge') === '') b.classList.add('active');
        });

        // Restore original image if nooki was applied
        if (originalImgDataUrl !== '') {
            studioImg = new Image();
            studioImg.onload = () => {
                updateStudioCanvas();
            };
            studioImg.src = originalImgDataUrl;
        } else {
            updateStudioCanvas();
        }
        
        showToast('스튜디오 설정이 초기화되었습니다.', 'info');
    });

    // Canvas exporter
    btnDownloadThumbnail.addEventListener('click', () => {
        if (!studioImg.src) {
            showToast('업로드된 상품 사진이 없습니다.', 'danger');
            return;
        }

        // Just download the current studioCanvas data directly since it is 100% accurate at 1000x1000px
        const link = document.createElement('a');
        link.download = `smartstore-thumbnail-1000x1000-${Date.now()}.png`;
        link.href = studioCanvas.toDataURL('image/png');
        link.click();
        
        showToast('고화질 썸네일 이미지가 성공적으로 다운로드되었습니다.', 'success');
    });

    // Real-time Canvas Rendering core engine
    function updateStudioCanvas() {
        const canvas = studioCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        // 1. Draw Background (AI or Preset)
        if (backgroundMode === 'ai' && aiBgImage) {
            ctx.drawImage(aiBgImage, 0, 0, W, H);
        } else {
            const bgType = studioBgSelect.value;
            if (bgType === 'studio') {
                // Soft 3D studio radial gradient
                let grad = ctx.createRadialGradient(W / 2, H * 0.4, W * 0.1, W / 2, H / 2, W * 0.7);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(1, '#cbd5e1');
                ctx.fillStyle = grad;
            } else if (bgType === 'wood') {
                // 2. 아늑한 감성 원목 톤
                ctx.fillStyle = '#f5e6d3';
            } else if (bgType === 'pastel') {
                // 3. 핑크-블루 파스텔 톤
                let grad = ctx.createLinearGradient(0, 0, W, H);
                grad.addColorStop(0, '#fce7f3');
                grad.addColorStop(1, '#e0f2fe');
                ctx.fillStyle = grad;
            } else if (bgType === 'dark') {
                // 4. 프리미엄 다크 스튜디오
                let grad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.6);
                grad.addColorStop(0, '#334155');
                grad.addColorStop(1, '#0f172a');
                ctx.fillStyle = grad;
            } else if (bgType === 'marble') {
                // 5. 고급 대리석 마블 톤
                ctx.fillStyle = '#f8fafc';
            } else {
                // 6. 미니멀 모던 그레이
                ctx.fillStyle = '#e2e8f0';
            }
            ctx.fillRect(0, 0, W, H);
        }

        // 2. Draw Product Image
        if (studioImg.src) {
            ctx.save();

            const scale = parseFloat(productScale.value);
            const posX = parseFloat(productPosX.value);
            const posY = parseFloat(productPosY.value);

            // Filter (brightness, contrast, saturation)
            const bright = rangeProductBrightness.value;
            const contrast = rangeProductContrast.value;
            const saturate = rangeProductSaturation.value;
            ctx.filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${saturate}%)`;

            // Drop Shadow on canvas
            const shdAlpha = parseFloat(shadowOpacity.value);
            const shdBlur = parseFloat(shadowBlur.value);
            const shdOffY = parseFloat(shadowY.value);

            if (shdAlpha > 0) {
                ctx.shadowColor = `rgba(0, 0, 0, ${shdAlpha})`;
                ctx.shadowBlur = shdBlur;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = shdOffY;
            }

            // Draw product centered + offsets
            const baseScale = Math.min((W * 0.65) / studioImg.width, (H * 0.65) / studioImg.height) * scale;
            const finalW = studioImg.width * baseScale;
            const finalH = studioImg.height * baseScale;

            const centerX = (W / 2) + posX;
            const centerY = (H / 2) + posY;

            ctx.translate(centerX, centerY);
            if (isFlippedH) ctx.scale(-1, 1);
            ctx.rotate((parseInt(productRotate.value) * Math.PI) / 180);

            ctx.drawImage(studioImg, -finalW / 2, -finalH / 2, finalW, finalH);
            ctx.restore();
        } else {
            // Draw placeholder text directly on canvas
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(0, 0, W, H);
            
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('상품 이미지를 업로드하세요', W / 2, H / 2 - 20);
            
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('(드래그 앤 드롭 또는 클릭하여 업로드)', W / 2, H / 2 + 30);
        }

        // Reset filter context
        ctx.filter = 'none';
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 3. Draw Badge
        if (currentBadgeText) {
            ctx.save();
            const badgeRadius = W * 0.055; // 5.5% of canvas width
            const centerX = badgeRadius + (W * 0.035);
            const centerY = badgeRadius + (H * 0.035);
            
            // Draw red circle
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(centerX, centerY, badgeRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw white border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = badgeRadius * 0.06;
            ctx.stroke();

            // Draw text
            ctx.fillStyle = '#ffffff';
            const fontScale = currentBadgeText.length > 3 ? 0.42 : 0.55;
            ctx.font = `bold ${badgeRadius * fontScale}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(currentBadgeText, centerX, centerY);
            ctx.restore();
        }

        // 4. Draw Sash text on bottom
        const customTextVal = inputSashText.value.trim();
        if (customTextVal) {
            ctx.save();
            const sashH = H * 0.088; // 8.8% of canvas height
            
            // Dark gray banner with 85% opacity
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(0, H - sashH, W, sashH);

            // Yellow bold text
            ctx.fillStyle = '#facc15';
            ctx.font = `bold ${sashH * 0.42}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(customTextVal, W / 2, H - (sashH / 2));
            ctx.restore();
        }
    }


    /* ==========================================================================
       [Tab 3] Sales Data Analytics & AI Report Logic
       ========================================================================== */
    const analyticsDropZone = document.getElementById('analytics-drop-zone');
    const analyticsFileInput = document.getElementById('analytics-file-input');
    const btnLoadDemoData = document.getElementById('btn-load-demo-data');
    const btnEmptyLoadDemo = document.getElementById('btn-empty-load-demo');
    
    const analyticsContent = document.getElementById('analytics-content');
    const analyticsEmptyState = document.getElementById('analytics-empty-state');

    // Stats variables
    let salesData = [];
    let filteredSalesData = [];
    let currentTablePage = 1;
    let tablePageSize = 10;
    let currentSortColumn = 'date';
    let currentSortOrder = 'desc';

    // Chart.js instances
    let trendChartInstance = null;
    let shareChartInstance = null;

    // Trigger file uploads
    analyticsDropZone.addEventListener('click', () => analyticsFileInput.click());
    
    analyticsDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        analyticsDropZone.classList.add('dragover');
    });

    analyticsDropZone.addEventListener('dragleave', () => {
        analyticsDropZone.classList.remove('dragover');
    });

    analyticsDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        analyticsDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            parseSalesFile(e.dataTransfer.files[0]);
        }
    });

    analyticsFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            parseSalesFile(e.target.files[0]);
        }
    });

    [btnLoadDemoData, btnEmptyLoadDemo].forEach(btn => {
        btn.addEventListener('click', () => {
            loadDemoData();
        });
    });

    function parseSalesFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(sheet);
                
                if (json.length === 0) {
                    showToast('엑셀/CSV 파일에 유효한 데이터 행이 존재하지 않습니다.', 'danger');
                    return;
                }

                processRawSalesData(json);
                showToast(`총 ${json.length}건의 거래 명세 정보를 가져왔습니다.`, 'success');
            } catch (err) {
                console.error(err);
                showToast('파일 분석 중 오류가 발생했습니다. 규격 엑셀 파일인지 확인 바랍니다.', 'danger');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // Support both Korean SmartStore export columns and English key variants
    function processRawSalesData(rawData) {
        salesData = rawData.map((row, idx) => {
            // Find appropriate fields via header mappings
            const date = row['주문일자'] || row['결제일'] || row['날짜'] || row['date'] || row['Date'] || new Date().toISOString().split('T')[0];
            const orderId = row['주문번호'] || row['번호'] || row['orderId'] || row['Order ID'] || `SS-${Date.now()}-${idx}`;
            const category = row['상품분류'] || row['카테고리'] || row['대분류'] || row['category'] || row['Category'] || '미분류';
            const product = row['상품명'] || row['품목'] || row['product'] || row['Product Name'] || '이름 없음 상품';
            const quantity = parseInt(row['수량'] || row['수'] || row['quantity'] || row['Qty'] || 1);
            
            // Clean currency string to integer
            let revRaw = row['결제금액'] || row['금액'] || row['주문금액'] || row['매출'] || row['revenue'] || row['Amount'] || 0;
            if (typeof revRaw === 'string') {
                revRaw = parseInt(revRaw.replace(/[^0-9-]/g, '')) || 0;
            } else {
                revRaw = parseInt(revRaw) || 0;
            }
            
            let status = row['주문상태'] || row['배송상태'] || row['상태'] || row['status'] || row['Status'] || '배송완료';
            if (status.includes('취소') || status.includes('반품') || status.includes('환불')) {
                status = '취소/반품';
            } else if (status.includes('완료') || status.includes('배송완료') || status.includes('구매확정')) {
                status = '배송완료';
            } else if (status.includes('중') || status.includes('배송중')) {
                status = '배송중';
            } else {
                status = '결제완료';
            }

            return {
                date: formatDateString(date),
                orderId: String(orderId),
                category: String(category),
                product: String(product),
                quantity: quantity,
                revenue: revRaw,
                status: status
            };
        });

        // Initialize UI content views
        analyticsEmptyState.style.display = 'none';
        analyticsContent.style.display = 'block';

        // Set up filters
        populateCategoryFilter();
        
        // Refresh calculations and tables
        filterAndProcessData();
    }

    function formatDateString(val) {
        if (typeof val === 'number') {
            // Excel Serial date parsing
            const date = new Date((val - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }
        
        let s = String(val).trim();
        // Remove time if it exists
        if (s.includes(' ')) {
            s = s.split(' ')[0];
        } else if (s.includes('T')) {
            s = s.split('T')[0];
        }

        // Standardize YYYY-MM-DD
        s = s.replace(/[^0-9]/g, '-');
        if (s.endsWith('-')) s = s.slice(0, -1);
        
        return s;
    }

    // Pre-populate mock Korean SmartStore transaction logs
    function loadDemoData() {
        const categories = ['패션잡화', '주방용품', '디지털/가전', '생활/건강'];
        const products = {
            '패션잡화': [
                { name: '에이치엔코 천연 소가죽 클래식 숄더백', price: 89000 },
                { name: '내추럴 캔버스 데일리 에코백', price: 18900 },
                { name: '슬림 미니 가죽 카드지갑', price: 29000 }
            ],
            '주방용품': [
                { name: '내열 이중유리 홈카페 맥주컵 450ml', price: 12500 },
                { name: '도자기 감성 디저트 접시 2인 세트', price: 34000 },
                { name: '북유럽 카페 감성 레트로 세라믹 머그', price: 15000 }
            ],
            '디지털/가전': [
                { name: '스마트 저소음 미니 가습기 (대용량)', price: 42000 },
                { name: '무선 핸디형 차량용 미니 청소기', price: 59000 },
                { name: '초고속 PD 충전 대용량 보조배터리 20000mAh', price: 28000 }
            ],
            '생활/건강': [
                { name: '친환경 세탁 세제 올가닉 시트러스 2L', price: 16500 },
                { name: '천연 아로마 유칼립투스 디퓨저 200ml', price: 22000 },
                { name: '무독성 실리콘 주방 조리도구 5종 세트', price: 27500 }
            ]
        };

        const statuses = ['배송완료', '배송완료', '배송완료', '배송완료', '배송완료', '결제완료', '배송중', '취소/반품'];

        const mockData = [];
        const baseDate = new Date('2026-08-05');

        // Generate ~80 orders distributed over the last 6 months
        for (let i = 0; i < 95; i++) {
            const orderDate = new Date(baseDate);
            // subtract random days
            orderDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 150));
            
            const category = categories[Math.floor(Math.random() * categories.length)];
            const prodList = products[category];
            const chosenProd = prodList[Math.floor(Math.random() * prodList.length)];
            
            const qty = Math.floor(Math.random() * 3) + 1; // 1 to 3
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            const orderId = `2026${String(orderDate.getMonth() + 1).padStart(2, '0')}${String(orderDate.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

            mockData.push({
                주문일자: orderDate.toISOString().split('T')[0],
                주문번호: orderId,
                카테고리: category,
                상품명: chosenProd.name,
                수량: qty,
                결제금액: chosenProd.price * qty,
                주문상태: status
            });
        }

        processRawSalesData(mockData);
        showToast('데모 판매 정산 데이터가 성공적으로 로드되었습니다.', 'success');
    }

    function populateCategoryFilter() {
        const filterSelect = document.getElementById('table-filter-category');
        if (!filterSelect) return;

        // Clear except first
        filterSelect.innerHTML = '<option value="all">전체 카테고리</option>';

        // Extract unique categories
        const categories = [...new Set(salesData.map(d => d.category))].sort();
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            filterSelect.appendChild(opt);
        });
    }

    /* Filters, Search & Table Operations */
    const searchInput = document.getElementById('table-search-input');
    const filterCategory = document.getElementById('table-filter-category');
    const filterStatus = document.getElementById('table-filter-status');
    const tablePageSizeSelect = document.getElementById('table-page-size');

    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');
    const pageNumberText = document.getElementById('page-number-text');
    const tableInfoText = document.getElementById('table-info-text');

    function filterAndProcessData() {
        const query = searchInput.value.toLowerCase().trim();
        const cat = filterCategory.value;
        const stat = filterStatus.value;

        // 1. Apply Filtering
        filteredSalesData = salesData.filter(row => {
            const matchesSearch = row.product.toLowerCase().includes(query) || row.orderId.includes(query);
            const matchesCategory = (cat === 'all' || row.category === cat);
            const matchesStatus = (stat === 'all' || row.status === stat);
            return matchesSearch && matchesCategory && matchesStatus;
        });

        // 2. Perform Calculations (on the full unfiltered dataset for dashboard coherence or filtered? Dashboard generally shows values based on filtered set to drill down! Let's do it on the filtered set for interactive dashboard experience, but fallback to overall statistics in insights)
        recalculateKPIs(filteredSalesData);
        
        // 3. Render charts
        renderTrendChart(filteredSalesData);
        renderCategoryShareChart(filteredSalesData);

        // 4. Sort and Page Data Table
        sortData();
        renderTablePage();

        // 5. Generate AI Insights
        generateAIReport();
    }

    // Bind filters events
    [searchInput, filterCategory, filterStatus].forEach(el => {
        el.addEventListener('input', () => {
            currentTablePage = 1;
            filterAndProcessData();
        });
    });

    tablePageSizeSelect.addEventListener('change', () => {
        tablePageSize = parseInt(tablePageSizeSelect.value);
        currentTablePage = 1;
        renderTablePage();
    });

    // KPI Recalculations
    function recalculateKPIs(data) {
        let totalSales = 0;
        let totalOrders = 0;
        let cancelledCount = 0;

        data.forEach(item => {
            if (item.status === '취소/반품') {
                cancelledCount++;
            } else {
                totalSales += item.revenue;
            }
            totalOrders++;
        });

        const activeOrders = totalOrders - cancelledCount;
        const aov = activeOrders > 0 ? Math.round(totalSales / activeOrders) : 0;
        const returnRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0.0;

        document.getElementById('kpi-total-sales').textContent = `₩${totalSales.toLocaleString('ko-KR')}`;
        document.getElementById('kpi-total-orders').textContent = `${totalOrders.toLocaleString('ko-KR')}건`;
        document.getElementById('kpi-aov').textContent = `₩${aov.toLocaleString('ko-KR')}`;
        document.getElementById('kpi-return-rate').textContent = `${returnRate.toFixed(1)}%`;
        
        // Highlight critical return rate
        const returnKpiCard = document.querySelector('.kpi-card[data-kpi="returns"]');
        if (returnRate > 10.0) {
            returnKpiCard.style.borderColor = 'rgba(244, 63, 94, 0.4)';
            document.getElementById('kpi-return-rate').style.color = 'var(--color-danger)';
        } else {
            returnKpiCard.style.borderColor = 'var(--border-color)';
            document.getElementById('kpi-return-rate').style.color = 'var(--text-primary)';
        }
    }

    // Sort Logic
    function sortData() {
        filteredSalesData.sort((a, b) => {
            let valA = a[currentSortColumn];
            let valB = b[currentSortColumn];

            // Handle date strings
            if (currentSortColumn === 'date') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }

            if (typeof valA === 'string') {
                return currentSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else {
                return currentSortOrder === 'asc' ? valA - valB : valB - valA;
            }
        });
    }

    // Headers clicks for sorting
    const tableHeaders = document.querySelectorAll('table.data-table th');
    tableHeaders.forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-column');
            if (currentSortColumn === col) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = col;
                currentSortOrder = 'desc'; // Default sorting is descending for new columns
            }

            // Update header sorting indicators
            tableHeaders.forEach(header => {
                const iconSpan = header.querySelector('.sort-icon');
                if (!iconSpan) return;
                
                const headerCol = header.getAttribute('data-column');
                if (headerCol === currentSortColumn) {
                    iconSpan.textContent = currentSortOrder === 'asc' ? '▲' : '▼';
                } else {
                    iconSpan.textContent = '';
                }
            });

            sortData();
            renderTablePage();
        });
    });

    // Pagination render
    function renderTablePage() {
        const tbody = document.getElementById('sales-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const totalItems = filteredSalesData.length;
        const totalPages = Math.ceil(totalItems / tablePageSize) || 1;

        if (totalItems === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);"><i data-lucide="info" style="display:inline-block; vertical-align: middle; margin-right: 0.25rem;"></i> 조건에 부합하는 거래 내역이 존재하지 않습니다.</td></tr>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
            btnPrevPage.disabled = true;
            btnNextPage.disabled = true;
            pageNumberText.textContent = '페이지 1 / 1';
            tableInfoText.textContent = '검색 결과 총 0건 중 0 - 0 표시';
            return;
        }

        // Bound page index
        if (currentTablePage < 1) currentTablePage = 1;
        if (currentTablePage > totalPages) currentTablePage = totalPages;

        const startIndex = (currentTablePage - 1) * tablePageSize;
        const endIndex = Math.min(startIndex + tablePageSize, totalItems);

        const pageData = filteredSalesData.slice(startIndex, endIndex);

        pageData.forEach(row => {
            const tr = document.createElement('tr');
            
            let statusPillClass = 'status-completed';
            if (row.status === '결제완료') statusPillClass = 'status-pending';
            if (row.status === '배송중') statusPillClass = 'status-pending'; // let's share pending design
            if (row.status === '취소/반품') statusPillClass = 'status-cancelled';

            tr.innerHTML = `
                <td>${row.date}</td>
                <td style="font-family: monospace; font-size: 0.8rem;">${row.orderId}</td>
                <td><span class="stat-badge">${row.category}</span></td>
                <td style="font-weight: 500; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${row.product}">${row.product}</td>
                <td style="text-align: right;">${row.quantity}개</td>
                <td style="text-align: right; font-weight: 600;">₩${row.revenue.toLocaleString('ko-KR')}</td>
                <td style="text-align: center;"><span class="status-pill ${statusPillClass}">${row.status}</span></td>
            `;
            tbody.appendChild(tr);
        });

        // Update pagination buttons
        btnPrevPage.disabled = currentTablePage === 1;
        btnNextPage.disabled = currentTablePage === totalPages;
        pageNumberText.textContent = `페이지 ${currentTablePage} / ${totalPages}`;
        tableInfoText.textContent = `검색 결과 총 ${totalItems}건 중 ${startIndex + 1} - ${endIndex} 표시`;
    }

    btnPrevPage.addEventListener('click', () => {
        if (currentTablePage > 1) {
            currentTablePage--;
            renderTablePage();
        }
    });

    btnNextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredSalesData.length / tablePageSize) || 1;
        if (currentTablePage < totalPages) {
            currentTablePage++;
            renderTablePage();
        }
    });

    // CSV Download
    document.getElementById('btn-export-excel').addEventListener('click', () => {
        if (filteredSalesData.length === 0) return;

        let csvContent = "\uFEFF"; // BOM for excel Korean character support
        csvContent += "주문일자,주문번호,카테고리,상품명,수량,주문금액,주문상태\n";
        
        filteredSalesData.forEach(row => {
            // Clean product name to remove any commas
            const cleanedProdName = row.product.replace(/"/g, '""');
            csvContent += `"${row.date}","${row.orderId}","${row.category}","${cleanedProdName}",${row.quantity},${row.revenue},"${row.status}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `smartstore-analytics-report-${Date.now()}.csv`;
        link.click();
        showToast('거래 분석 내역이 CSV 파일로 다운로드되었습니다.', 'success');
    });


    /* ==========================================================================
       Chart.js Graphs Renderings
       ========================================================================== */
    function renderTrendChart(data) {
        const ctx = document.getElementById('chart-sales-trend');
        if (!ctx) return;

        // Group revenue by date
        const revenueByDate = {};
        data.forEach(item => {
            if (item.status !== '취소/반품') {
                revenueByDate[item.date] = (revenueByDate[item.date] || 0) + item.revenue;
            }
        });

        // Sort dates chronologically
        const sortedDates = Object.keys(revenueByDate).sort();
        const salesValues = sortedDates.map(date => revenueByDate[date]);

        // Destroy previous chart
        if (trendChartInstance) {
            trendChartInstance.destroy();
        }

        // Format dates short format for display
        const dateLabels = sortedDates.map(d => {
            const parts = d.split('-');
            return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
        });

        trendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dateLabels,
                datasets: [{
                    label: '일별 결제 완료액 (₩)',
                    data: salesValues,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.05)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#6366f1',
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#03c75a'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` 매출액: ₩${context.raw.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            callback: function(value) {
                                if (value >= 1000000) return (value / 1000000) + 'M';
                                if (value >= 1000) return (value / 1000) + 'K';
                                return value;
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            maxTicksLimit: 12
                        }
                    }
                }
            }
        });
    }

    function renderCategoryShareChart(data) {
        const ctx = document.getElementById('chart-category-share');
        if (!ctx) return;

        // Sum category revenues
        const revs = {};
        data.forEach(item => {
            if (item.status !== '취소/반품') {
                revs[item.category] = (revs[item.category] || 0) + item.revenue;
            }
        });

        const categories = Object.keys(revs);
        const revenues = categories.map(cat => revs[cat]);

        // Destroy previous chart
        if (shareChartInstance) {
            shareChartInstance.destroy();
        }

        // Custom palette matching SaaS accents
        const palette = ['#6366f1', '#03c75a', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6'];

        shareChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: revenues,
                    backgroundColor: palette.slice(0, categories.length),
                    borderWidth: 2,
                    borderColor: '#131b2e'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#f8fafc',
                            font: {
                                size: 11
                            },
                            boxWidth: 12,
                            padding: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return ` ${context.label}: ₩${context.raw.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    function updateCharts() {
        if (trendChartInstance) trendChartInstance.resize();
        if (shareChartInstance) shareChartInstance.resize();
    }


    /* ==========================================================================
       AI Insight Report Engine
       ========================================================================== */
    function generateAIReport() {
        const summaryPointsContainer = document.getElementById('insight-summary-points');
        const recsContainer = document.getElementById('insight-recommendations-list');
        
        if (salesData.length === 0) return;

        // Perform analysis calculations on full sales dataset
        let totalSales = 0;
        let totalOrders = 0;
        let cancelledCount = 0;
        const categoryStats = {};
        const productStats = {};
        const dateStats = {};

        salesData.forEach(item => {
            totalOrders++;
            if (item.status === '취소/반품') {
                cancelledCount++;
            } else {
                totalSales += item.revenue;
                // Category group
                categoryStats[item.category] = (categoryStats[item.category] || 0) + item.revenue;
                // Product group
                productStats[item.product] = (productStats[item.product] || 0) + item.revenue;
                // Date group
                dateStats[item.date] = (dateStats[item.date] || 0) + item.revenue;
            }
        });

        // 1. Identify peak day
        let peakDate = '정보 부족';
        let peakRevenue = 0;
        Object.keys(dateStats).forEach(d => {
            if (dateStats[d] > peakRevenue) {
                peakRevenue = dateStats[d];
                peakDate = d;
            }
        });

        // 2. Identify top product
        let topProduct = '정보 부족';
        let topProdRevenue = 0;
        Object.keys(productStats).forEach(p => {
            if (productStats[p] > topProdRevenue) {
                topProdRevenue = productStats[p];
                topProduct = p;
            }
        });

        // 3. Identify top category
        let topCategory = '정보 부족';
        let topCatRevenue = 0;
        Object.keys(categoryStats).forEach(c => {
            if (categoryStats[c] > topCatRevenue) {
                topCatRevenue = categoryStats[c];
                topCategory = c;
            }
        });

        const topCatPercentage = totalSales > 0 ? ((topCatRevenue / totalSales) * 100).toFixed(1) : 0;
        const cancelRate = (cancelledCount / totalOrders) * 100;
        const aovVal = (totalOrders - cancelledCount) > 0 ? Math.round(totalSales / (totalOrders - cancelledCount)) : 0;

        // Format dates into readable string
        const formattedPeakDate = peakDate !== '정보 부족' ? formatDateKorean(peakDate) : '정보 부족';

        // Render Summary Points
        summaryPointsContainer.innerHTML = `
            <div class="insight-point-item point-positive">
                <strong>매출 견인 1등 공신 품목</strong>
                <span>'${topProduct}' 상품이 누적 ₩${topProdRevenue.toLocaleString()}원의 결제를 기록하며 최다 매출 품목으로 확인되었습니다.</span>
            </div>
            <div class="insight-point-item">
                <strong>카테고리 집중도 분석</strong>
                <span>전체 매출 중 '${topCategory}' 군이 약 ${topCatPercentage}%의 비중을 차지하여 가장 높은 집중 기여도를 나타내고 있습니다.</span>
            </div>
            <div class="insight-point-item point-positive">
                <strong>최대 거래 발생 시점 (골든 데이)</strong>
                <span>${formattedPeakDate}에 일일 최고 매출인 ₩${peakRevenue.toLocaleString()}원을 달성한 피크 거래량이 포착되었습니다.</span>
            </div>
            <div class="insight-point-item ${cancelRate > 10 ? 'point-negative' : 'point-positive'}">
                <strong>주문 취소 및 환불률</strong>
                <span>총 ${totalOrders}건 중 취소율은 ${cancelRate.toFixed(1)}% 입니다. ${cancelRate > 10 ? '업계 평균 대비 다소 높으므로 모니터링이 필요합니다.' : '매우 안정적인 취소 방어율을 기록하고 있습니다.'}</span>
            </div>
        `;

        // Generate tailored Action Plan Recommendations list
        const recList = [];
        
        // Recommendation 1: SEO listing recommendation
        recList.push(`현재 가장 많이 팔린 <strong>'${topProduct.split(' ')[0]}'</strong> 상품군의 유입 키워드를 다변화하기 위해, [키워드 조합기] 탭에서 최적화된 서브 키워드를 적용해 보세요. 현재 브랜드 키워드 외의 유기적 유입을 확대할 여지가 큽니다.`);
        
        // Recommendation 2: Marketing recommendation
        recList.push(`매출 기여도가 ${topCatPercentage}%로 가장 높은 <strong>'${topCategory}'</strong> 카테고리에 대해, 타겟 매칭 광고의 노출 빈도를 최고 매출 요일인 <strong>${formattedPeakDate.split(' ')[1] || '해당 피크 요일'}</strong>에 맞춤 집중하여 광고 마진 효율(ROAS)을 극대화하십시오.`);

        // Recommendation 3: Cancel Rate and FAQ recommendation
        if (cancelRate > 10) {
            recList.push(`최근 주문 취소/반품 비율이 ${cancelRate.toFixed(1)}%로 경고 수치에 도달했습니다. 반품 사유를 면밀히 분석한 후, 상세페이지 하단에 [자주 묻는 질문 FAQ] 및 정확한 [사이즈/색상/소재 실측 기준 가이드]를 보강하여 오구매를 사전에 차단하십시오.`);
        } else {
            recList.push(`환불 비율이 안정적이므로, 현재의 상품 품질 및 고객 관리가 우수한 수준입니다. 주력 품목 외의 서브 품목 판매를 촉진하기 위해 [AI 썸네일 스튜디오]에서 누끼 이미지를 기반으로 럭셔리 배경 썸네일을 추가 제작하여 세트 구성 등록을 적극 권장합니다.`);
        }

        // Recommendation 4: AOV & Bundling recommendation
        const targetAov = Math.round(aovVal * 1.25);
        recList.push(`현재 평균 객단가(AOV)는 ₩${aovVal.toLocaleString()}원입니다. 단가 확장을 위해 추가 구매율이 높은 소품 또는 추가 옵션 품목을 구성하여 목표 객단가인 <strong>₩${targetAov.toLocaleString()}원</strong>을 달성할 수 있는 복수 구매 묶음 배송 쿠폰 프로모션을 추진하십시오.`);

        recsContainer.innerHTML = '';
        recList.forEach(rec => {
            const li = document.createElement('li');
            li.innerHTML = rec;
            recsContainer.appendChild(li);
        });
    }

    function formatDateKorean(dateStr) {
        if (!dateStr || dateStr === '정보 부족') return '정보 부족';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        
        const year = parts[0];
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        
        const d = new Date(year, month - 1, day);
        const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        const dayOfWeek = weekdays[d.getDay()];
        
        return `${month}월 ${day}일 (${dayOfWeek})`;
    }

    /* ==========================================================================
       [Tab 4] Blog Copywriting Creator Logic
       ========================================================================== */
    const inputBlogProdName = document.getElementById('input-blog-prodname');
    const inputBlogUsp = document.getElementById('input-blog-usp');
    const selectBlogTone = document.getElementById('select-blog-tone');
    const selectBlogTags = document.getElementById('select-blog-tags');
    const selectBlogLayout = document.getElementById('select-blog-layout');
    const btnGenerateBlog = document.getElementById('btn-generate-blog');
    
    const blogResultPlaceholder = document.getElementById('blog-result-placeholder');
    const blogResultContent = document.getElementById('blog-result-content');
    const blogTitlesList = document.getElementById('blog-titles-list');
    const blogBodyText = document.getElementById('blog-body-text');
    const blogTagsContainer = document.getElementById('blog-tags-container');
    
    const btnCopyBlogBody = document.getElementById('btn-copy-blog-body');
    const btnDownloadBlogTxt = document.getElementById('btn-download-blog-txt');
    const btnCopyBlogTags = document.getElementById('btn-copy-blog-tags');

    if (btnGenerateBlog) {
        btnGenerateBlog.addEventListener('click', () => {
            const prodName = inputBlogProdName.value.trim();
            const uspRaw = inputBlogUsp.value.trim();

            if (!prodName) {
                showToast('상품명 또는 키워드를 입력해 주세요.', 'danger');
                inputBlogProdName.focus();
                return;
            }

            // Parse USPs
            const usps = uspRaw.split('\n')
                .map(line => line.replace(/^-\s*/, '').trim())
                .filter(line => line.length > 0);
                
            // If empty, fall back to default USPs
            if (usps.length === 0) {
                usps.push('가장 혁신적인 기술력과 실용적인 디자인');
                usps.push('사용자의 편의성을 극대화한 사용법');
                usps.push('꼼꼼한 마감 처리와 최상급 소재 채용');
            }

            const tone = selectBlogTone.value;
            const tagsCount = parseInt(selectBlogTags.value);
            const layout = selectBlogLayout.value;

            // Generate Titles (3 variants)
            const titles = generateBlogTitles(prodName, usps[0] || '');
            renderBlogTitles(titles);

            // Generate Body Text
            const bodyText = generateBlogBody(prodName, usps, tone, layout);
            blogBodyText.innerHTML = bodyText; // Use innerHTML to preserve line breaks and [image] suggestions styling

            // Generate Tags
            const tags = generateBlogTags(prodName, usps, tagsCount);
            renderBlogTags(tags);

            // Switch Visibility
            blogResultPlaceholder.style.display = 'none';
            blogResultContent.style.display = 'flex';

            // Re-initialize Lucide icons for copy buttons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            showToast('블로그 홍보글 초안이 성공적으로 생성되었습니다!', 'success');
        });
    }

    // Copy to clipboard helpers
    if (btnCopyBlogBody) {
        btnCopyBlogBody.addEventListener('click', () => {
            const text = blogBodyText.innerText || blogBodyText.textContent;
            navigator.clipboard.writeText(text).then(() => {
                showToast('본문 초안이 클립보드에 복사되었습니다.', 'success');
            }).catch(err => {
                showToast('복사에 실패했습니다.', 'danger');
            });
        });
    }

    if (btnCopyBlogTags) {
        btnCopyBlogTags.addEventListener('click', () => {
            const tagsText = Array.from(blogTagsContainer.querySelectorAll('span'))
                .map(el => el.textContent)
                .join(' ');
            navigator.clipboard.writeText(tagsText).then(() => {
                showToast('추천 해시태그가 복사되었습니다.', 'success');
            }).catch(err => {
                showToast('복사에 실패했습니다.', 'danger');
            });
        });
    }

    if (btnDownloadBlogTxt) {
        btnDownloadBlogTxt.addEventListener('click', () => {
            const prodName = inputBlogProdName.value.trim();
            const activeTitleEl = blogTitlesList.querySelector('.result-card .result-title');
            const mainTitle = activeTitleEl ? activeTitleEl.textContent : `${prodName} 블로그 홍보글`;
            const bodyText = blogBodyText.innerText || blogBodyText.textContent;
            const tagsText = Array.from(blogTagsContainer.querySelectorAll('span'))
                .map(el => el.textContent)
                .join(' ');

            const fileContent = `★ 블로그 제목 추천 ★\n${Array.from(blogTitlesList.querySelectorAll('.result-title')).map((el, i) => `${i+1}. ${el.textContent}`).join('\n')}\n\n========================================\n\n★ 블로그 본문 초안 ★\n\n${bodyText}\n\n========================================\n\n★ 추천 해시태그 ★\n${tagsText}\n`;

            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${prodName}-blog-draft-${Date.now()}.txt`;
            link.click();
            showToast('텍스트 파일로 저장되었습니다.', 'success');
        });
    }

    function generateBlogTitles(prodName, primaryUsp) {
        return [
            `내돈내산 솔직후기! ${prodName} 직접 써보고 느낀 진짜 장단점 총정리`,
            `SNS에서 난리난 ${prodName}, 직접 써보니 소문대로 대박이네요 (${primaryUsp} 대만족)`,
            `[실제리뷰] 삶의 질 수직상승템! ${prodName} 2주 사용 솔직 후기 (feat. ${primaryUsp})`
        ];
    }

    function renderBlogTitles(titles) {
        blogTitlesList.innerHTML = '';
        titles.forEach(title => {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.style.display = 'flex';
            card.style.justify = 'space-between';
            card.style.alignItems = 'center';
            card.style.gap = '1rem';
            card.style.marginBottom = '0.5rem';
            card.style.padding = '0.75rem 1rem';

            card.innerHTML = `
                <div class="result-title" style="margin-bottom: 0; font-size: 0.9rem; font-weight: 600; color: var(--text-primary); text-align: left;">${title}</div>
                <button class="btn btn-secondary btn-sm btn-copy-title" data-title="${title.replace(/"/g, '&quot;')}" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; flex-shrink: 0;">
                    <i data-lucide="copy" style="width: 12px; height: 12px;"></i> 복사
                </button>
            `;
            
            card.querySelector('.btn-copy-title').addEventListener('click', (e) => {
                const titleText = e.currentTarget.getAttribute('data-title');
                navigator.clipboard.writeText(titleText).then(() => {
                    showToast('제목이 클립보드에 복사되었습니다.', 'success');
                });
            });

            blogTitlesList.appendChild(card);
        });
    }

    function generateBlogBody(prodName, usps, tone, layout) {
        let intro = '';
        let body = '';
        let outro = '';

        const usp1 = usps[0] || '우수한 품질';
        const usp2 = usps[1] || '감각적인 디자인';
        const usp3 = usps[2] || '실용적인 수납력';
        const usp4 = usps[3] || '합리적인 가격대';

        if (tone === 'review') {
            intro = `안녕하세요 여러분! 😊\n\n요즘 매일 들고 다니거나 사용하는 제품 중 정말 제 마음속 '원픽'으로 등극한 꿀템이 있어서 솔직한 내돈내산 후기로 소개해 드리려고 해요!\n\n바로 요즘 인스타와 맘카페 등에서 핫하게 언급되는 **${prodName}** 입니다.\n\n바쁘고 정신없는 일상 중에서 어떤 아이템을 고를지 한참 헤매다가 발견한 제품인데, 직접 며칠간 써보니 주변 지인들에게 꼭 권하고 싶어지더라고요.`;
            
            outro = `여기까지 **${prodName}** 리얼 사용 후기였습니다!\n\n결론부터 말씀드리자면, 제 평점은 ★★★★★ 별 다섯 개 만점이에요. 일상에서 매번 쓸 때마다 대접받는 느낌이 들 정도로 삶의 질이 한 층 업그레이드된 기분입니다.\n\n혹시 실용적이면서도 디자인까지 챙길 수 있는 상품을 고민 중이셨다면, 늦지 않게 꼭 만나보시길 강력하게 권해드립니다! 후회 없는 선택이 되실 거예요. 💕\n\n오늘도 끝까지 읽어주셔서 감사합니다. 궁금한 점이 있으시면 댓글로 달아주세요!`;
        } else if (tone === 'brand') {
            intro = `안녕하세요, 공식 브랜드 에디터입니다. 🌿\n\n최근 들어 저희 브랜드의 시그니처 모델이자 뛰어난 완성도로 수많은 고객님들의 러브콜을 한 몸에 받고 있는 **${prodName}**에 대해 전해드리고자 합니다.\n\n이 제품은 기본을 지키는 정직함 위에 트렌디한 가치를 더해, 실용성과 품격을 동시에 추구하시는 현명한 소비자를 위해 탄생했습니다.\n\n완벽에 기한 설계와 철저한 마감이 더해진 프리미엄 라이프웨어로서 본 제품이 가진 핵심 가치를 지금 소개합니다.`;
            
            outro = `제조와 공정의 시작부터 마지막 포장 상태를 검수하는 최종 단계까지 엄격한 검사를 통과한 **${prodName}**.\n\n고객님들의 신뢰도와 만족도를 최우선으로 두는 저희 브랜드의 진심이 담긴 대표 역작을 자신 있게 선보입니다.\n\n본 공식 브랜드 포스팅을 기점으로, 실생활의 퀄리티를 대폭 확장해 보시길 바랍니다. 추가 정보나 공식 스마트스토어 상세 혜택은 본문 하단 링크를 참조해 주세요. 감사합니다.`;
        } else { // sales
            intro = `🚨 [역대급 핫딜 소식!] 쇼핑 만족도 1위 등극! 🎉\n\n품절 대란의 주역이자 실시간 급상승 키워드를 강타한 화제의 아이템, **${prodName}** 특별 할인 이벤트 프로모션을 들고 왔습니다!\n\n그동안 높은 가격이나 재고 부족으로 인해서 망설이셨던 분들이 계셨다면 바로 오늘이 기회입니다.\n\n왜 수많은 사람들이 그토록 **${prodName}**을 극찬하고 소장하고 싶어 하는지, 한 번에 납득할 수 있는 엄청난 스펙을 단도직입적으로 소개해 드릴게요!`;
            
            outro = `초특가 한정 수량 할인 이벤트는 재고 소진 시 예고 없이 자동 종료되므로 망설이시면 바로 품절입니다! ⏰\n\n매일 쓰는 필수템인 만큼 한 살이라도 더 젊고, 혜택이 가장 클 때 현명하게 소장하시는 것을 강력 추천해 드립니다.\n\n더 상세한 할인율과 특별 사은품 증정 혜택은 지금 바로 아래 공식 판매 스마트스토어 링크로 접속하여 놓치지 마세요! 👇`;
        }

        if (layout === 'standard') {
            body = `[이미지 1 권장: 제품의 전체적인 실물 실루엣 컷]\n\n가장 먼저 눈에 띄는 특징은 단연 **${usp1}** 입니다.\n\n사실 다른 유사 제품들을 볼 때 이 부분이 늘 아쉬웠는데, 본 제품은 설계 단계부터 완성도 있게 보완되어 아주 만족스러운 사용감을 가져다주었습니다.\n\n\n[이미지 2 권장: 제품 표면 질감 또는 작동 상세 클로즈업]\n\n두 번째 장점은 바로 **${usp2}** 에요!\n\n이게 보기에는 단순해 보여도 실제 일상에서 마주하면 엄청난 차이점을 만들어내더라고요. 감성적이면서도 내구성까지 알차게 챙긴 매력 넘치는 부분입니다.\n\n\n[이미지 3 권장: 실생활에서 제품을 실제로 작동/사용하는 라이프 스타일 컷]\n\n여기에 추가적으로 **${usp3}** 과 더불어 **${usp4}** 까지 아우르고 있어서, 가격 대비 만족도(가성비)와 심리적 만족(가심비)을 완벽하게 충족시켜 주고 있습니다.`;
        } else if (layout === 'experience') {
            body = `[이미지 1 권장: 택배 박스 및 꼼꼼하게 완충재로 포장된 언박싱 컷]\n\n배송을 접하고 박스를 열자마자 포장 상태부터 정말 감동이었습니다! 🎁\n\n제품 자체의 첫인상은 매우 튼튼하고 고급스러워 보였는데, 특히 제품 디자인의 정교함과 **${usp1}**이 한눈에 느껴지더라고요.\n\n\n[이미지 2 권장: 제품 내부 수납 또는 핵심 스펙을 시각적으로 강조한 상세 컷]\n\n실제로 제 일과 시간 내내 사용해 보니 확실히 체감이 달랐습니다. \n\n제일 유용했던 건 **${usp2}**이었고, **${usp3}** 덕분에 쓸 때마다 불편함 없이 편리하게 활용할 수 있었습니다. 확실히 작은 마감 하나하나 신경 쓴 디테일이 보였습니다.\n\n\n[이미지 3 권장: 제품을 돋보이게 하는 감성적인 야외 또는 자연광 아래 컷]\n\n사용하면서 딱히 아쉬운 단점을 찾기 힘들었을 만큼 전체적인 만듦새가 뛰어납니다.\n\n무엇보다 **${usp4}** 부분은 타사 제품들과 완전히 구별되는 최고의 신의 한 수라고 생각되네요!`;
        } else { // qa
            body = `📢 많은 분들이 가장 자주 질문 주시는 대표 핵심 체크리스트!\n\n**Q1. 정말 광고처럼 실용적인가요?**\n\n- 네! 본 제품은 **${usp1}**을 기반으로 만들어져 실제 일상 테스트에서 아주 우수한 평가를 받았습니다.\n\n\n[이미지 1 권장: 질문 사항을 시각적으로 증명할 수 있는 정면 컷]\n\n**Q2. 어떤 사용 상황에서 가장 빛을 발하나요?**\n\n- 바로 **${usp2}** 장점 덕분에 직장이나 야외, 가사 활동 등 다양한 공간에서 전혀 이질감 없이 녹아듭니다.\n\n\n[이미지 2 권장: 다각도 측면 및 두께감을 알 수 있는 360도 뷰 컷]\n\n**Q3. 다른 제품군과 구별되는 독보적인 강점은 무엇인가요?**\n\n- 첫째는 **${usp3}**이며, 둘째는 지속적으로 체감 효율을 올려주는 **${usp4}**을 채용한 점입니다. 구매를 고민하는 분들에게 가장 큰 결정적 단서가 될 장점들입니다.`;
        }

        return `${intro}\n\n========================================\n\n${body}\n\n========================================\n\n${outro}`;
    }

    function generateBlogTags(prodName, usps, count) {
        const prodKeyword = prodName.replace(/\s+/g, '');
        const coreTags = [
            `#${prodKeyword}`,
            `#${prodKeyword}추천`,
            `#${prodKeyword}후기`,
            `#스마트스토어`,
            `#내돈내산리뷰`,
            `#살림템`,
            `#일상꿀템`,
            `#필수템`,
            `#쇼핑성공`,
            `#이커머스`,
            `#선물추천`,
            `#감성제품`,
            `#리얼후기`,
            `#장단점비교`,
            `#인생템`
        ];

        usps.forEach(usp => {
            const words = usp.split(/\s+/).filter(w => w.length > 2);
            words.forEach(word => {
                const cleanWord = word.replace(/[^\wㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
                if (cleanWord.length >= 2 && coreTags.indexOf(`#${cleanWord}`) === -1) {
                    coreTags.push(`#${cleanWord}`);
                }
            });
        });

        return coreTags.slice(0, count);
    }

    function renderBlogTags(tags) {
        blogTagsContainer.innerHTML = '';
        tags.forEach(tag => {
            const span = document.createElement('span');
            span.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
            span.style.color = 'var(--color-indigo)';
            span.style.padding = '0.2rem 0.5rem';
            span.style.borderRadius = '4px';
            span.style.cursor = 'pointer';
            span.style.fontSize = '0.75rem';
            span.style.fontWeight = '500';
            span.style.margin = '2px';
            span.style.display = 'inline-block';
            span.style.transition = 'background-color 0.2s';
            span.textContent = tag;

            span.addEventListener('click', () => {
                navigator.clipboard.writeText(tag).then(() => {
                    showToast(`태그 ${tag}가 복사되었습니다.`, 'success');
                });
            });

            span.addEventListener('mouseenter', () => {
                span.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
            });
            span.addEventListener('mouseleave', () => {
                span.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
            });

            blogTagsContainer.appendChild(span);
        });
    }

    /* ==========================================================================
       Virtual Desktop Environment Controller
       ========================================================================== */
    const desktopEnv = document.querySelector('.desktop-env');
    const dockBtnApp = document.getElementById('dock-btn-app');
    const dockBtnModeToggle = document.getElementById('dock-btn-mode-toggle');
    const controlClose = document.querySelector('.control-dot.close');
    const controlMinimize = document.querySelector('.control-dot.minimize');
    const controlMaximize = document.querySelector('.control-dot.maximize');

    if (dockBtnModeToggle && desktopEnv) {
        dockBtnModeToggle.addEventListener('click', () => {
            const isWebMode = desktopEnv.classList.toggle('web-mode');
            
            if (isWebMode) {
                dockBtnModeToggle.classList.add('active');
                dockBtnApp.classList.remove('active');
                const dot = dockBtnApp.querySelector('.dock-dot');
                if (dot) dot.style.display = 'none';
                
                showToast('웹 전체화면 모드로 전환되었습니다.', 'info');
            } else {
                dockBtnModeToggle.classList.remove('active');
                dockBtnApp.classList.add('active');
                const dot = dockBtnApp.querySelector('.dock-dot');
                if (dot) dot.style.display = 'block';
                
                showToast('데스크톱 프로그램 창 모드로 전환되었습니다.', 'info');
            }
            
            // Trigger charts redraw for new layout size
            setTimeout(updateCharts, 250);
        });
    }

    if (dockBtnApp && desktopEnv) {
        dockBtnApp.addEventListener('click', () => {
            if (desktopEnv.classList.contains('web-mode')) {
                dockBtnModeToggle.click(); // trigger toggle back to app mode
            } else {
                showToast('대시보드 앱이 이미 활성화되어 있습니다.', 'info');
            }
        });
    }

    // Window controls custom interactions
    if (controlClose) {
        controlClose.addEventListener('click', () => {
            if (confirm('대시보드 프로그램 창을 종료하시겠습니까? (확인 클릭 시 웹 전체화면 뷰로 복귀합니다)')) {
                if (desktopEnv && !desktopEnv.classList.contains('web-mode')) {
                    dockBtnModeToggle.click();
                }
            }
        });
    }

    if (controlMinimize) {
        controlMinimize.addEventListener('click', () => {
            showToast('창 최소화 기능은 데모 상태입니다. (실제 OS 창이 아니므로 하단 독바를 이용해 주세요)', 'info');
        });
    }

    if (controlMaximize) {
        controlMaximize.addEventListener('click', () => {
            if (dockBtnModeToggle) {
                dockBtnModeToggle.click();
            }
        });
    }

    // Initial canvas setup on app load
    updateStudioCanvas();
});
