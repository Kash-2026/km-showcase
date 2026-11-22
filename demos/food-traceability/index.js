// In-browser mock reflecting model.py logic
const lots = [
    { lot_id: 'LOT-101', name: 'Rolled Oats', allergens: [], expiry_date: '2025-12-31' },
    { lot_id: 'LOT-102', name: 'Raw Almonds', allergens: ['tree nuts'], expiry_date: '2025-08-15' },
    { lot_id: 'LOT-103', name: 'Wildflower Honey', allergens: [], expiry_date: '2025-05-01' },
    { lot_id: 'LOT-104', name: 'Soy Lecithin', allergens: ['soy'], expiry_date: '2026-01-01' }
];

const batches = {};

function init() {
    renderLots();
    populateSelects();

    document.getElementById('btn-produce').addEventListener('click', handleProduceBatch);
    document.getElementById('btn-recall').addEventListener('click', handleRecallImpact);
}

function renderLots() {
    const listEl = document.getElementById('lots-list');
    listEl.innerHTML = '';
    lots.forEach(lot => {
        const item = document.createElement('div');
        item.style.marginBottom = '0.5rem';
        const allergens = lot.allergens.length > 0 
            ? lot.allergens.map(a => `<span class="badge badge-allergen">${a}</span>`).join('') 
            : '<span class="badge">No allergens</span>';
        item.innerHTML = `<strong>${lot.lot_id}</strong> - ${lot.name} (Expires: ${lot.expiry_date}) | ${allergens}`;
        listEl.appendChild(item);
    });
}

function populateSelects() {
    const lotSelect = document.getElementById('lot-selection');
    const recallSelect = document.getElementById('recall-lot-id');
    lotSelect.innerHTML = '';
    recallSelect.innerHTML = '';

    lots.forEach(lot => {
        const opt1 = document.createElement('option');
        opt1.value = lot.lot_id;
        opt1.textContent = `${lot.lot_id}: ${lot.name}`;
        lotSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = lot.lot_id;
        opt2.textContent = `${lot.lot_id}: ${lot.name}`;
        recallSelect.appendChild(opt2);
    });
}

function handleProduceBatch() {
    const batchId = document.getElementById('batch-id').value.trim();
    const productName = document.getElementById('product-name').value.trim();
    const producedOn = document.getElementById('prod-date').value;
    const select = document.getElementById('lot-selection');
    const selectedLotIds = Array.from(select.selectedOptions).map(o => o.value);
    const outputEl = document.getElementById('production-output');

    if (!batchId || !producedOn || selectedLotIds.length === 0) {
        outputEl.textContent = 'Error: Fill batch ID, production date, and select at least one lot.';
        return;
    }

    // Expiry check
    for (const lid of selectedLotIds) {
        const lot = lots.find(l => l.lot_id === lid);
        if (lot.expiry_date < producedOn) {
            outputEl.textContent = `ExpiredIngredientError: Ingredient lot ${lid} expired on ${lot.expiry_date} before production date ${producedOn}. Batch rejected.`;
            return;
        }
    }

    // Record batch
    batches[batchId] = {
        batch_id: batchId,
        product_name: productName,
        ingredient_lot_ids: selectedLotIds,
        produced_on: producedOn
    };

    // Rollup allergens
    const allergens = new Set();
    selectedLotIds.forEach(lid => {
        const lot = lots.find(l => l.lot_id === lid);
        lot.allergens.forEach(a => allergens.add(a));
    });

    const allergenList = Array.from(allergens);
    outputEl.textContent = `Batch ${batchId} produced successfully!\nAggregated Allergens: ${allergenList.length > 0 ? allergenList.join(', ') : 'None'}`;
}

function handleRecallImpact() {
    const lotId = document.getElementById('recall-lot-id').value;
    const outputEl = document.getElementById('recall-output');

    const affected = [];
    for (const [bid, b] of Object.entries(batches)) {
        if (b.ingredient_lot_ids.includes(lotId)) {
            affected.push(bid);
        }
    }
    affected.sort();

    if (affected.length === 0) {
        outputEl.textContent = `No batches affected by recall of ${lotId}.`;
    } else {
        outputEl.textContent = `Affected Batches (${affected.length}):\n` + affected.join('\n');
    }
}

window.addEventListener('DOMContentLoaded', init);