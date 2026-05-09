const fs = require('fs');

function extractObject(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    // Remove the "const Gx=" part and the trailing semicolon
    const cleanContent = content.replace(/^const G\d=\s*/, '').replace(/;\s*$/, '');
    // Use eval to parse the JS object (carefully, since we trust the file content here)
    return eval('(' + cleanContent + ')');
}

const g5 = extractObject('/Users/enaselmershati/Desktop/skin/smart-skin-scope/src/data/G5.js');
const g6 = extractObject('/Users/enaselmershati/Desktop/skin/smart-skin-scope/src/data/G6.js');
const g7 = extractObject('/Users/enaselmershati/Desktop/skin/smart-skin-scope/src/data/G7.js');
const g8 = extractObject('/Users/enaselmershati/Desktop/skin/smart-skin-scope/src/data/G8.js');

const matrix = {
    groups: {
        g5: {
            label: "Symptômes & Tendances",
            description: g5.desc,
            scenarios: g5.rows.map(row => ({
                id: row.srclbl.replace(' + ', '_'),
                factor: row.f,
                icon: row.ic,
                trigger: {
                    symptom: row.srclbl.split(' + ')[0],
                    trend: row.srclbl.split(' + ')[1]
                },
                advice: {
                    dry: { title: row.dry.t, body: row.dry.a, tip: row.dry.tip },
                    oily: { title: row.oily.t, body: row.oily.a, tip: row.oily.tip },
                    combo: { title: row.combo.t, body: row.combo.a, tip: row.combo.tip },
                    normal: { title: row.normal.t, body: row.normal.a, tip: row.normal.tip }
                }
            }))
        },
        g6: {
            label: "Cycle Hormonal",
            description: g6.desc,
            scenarios: g6.rows.map(row => ({
                id: `cycle_${row.trig.match(/'([^']+)'/)[1]}`,
                factor: row.f,
                icon: row.ic,
                trigger: {
                    cyclePhase: row.trig.match(/'([^']+)'/)[1]
                },
                advice: {
                    dry: { title: row.dry.t, body: row.dry.a, tip: row.dry.tip },
                    oily: { title: row.oily.t, body: row.oily.a, tip: row.oily.tip },
                    combo: { title: row.combo.t, body: row.combo.a, tip: row.combo.tip },
                    normal: { title: row.normal.t, body: row.normal.a, tip: row.normal.tip }
                }
            }))
        },
        g7: {
            label: "Face Mapping",
            description: g7.desc,
            scenarios: []
        },
        g8: {
            label: "Suivi Routine",
            description: g8.desc,
            scenarios: g8.rows.map(row => {
                const trigger = {};
                if (row.trig.includes('evening_routine_done')) trigger.eveningRoutineDone = false;
                if (row.trig.includes('makeup_removed')) trigger.makeupRemoved = false;
                if (row.trig.includes('morning_routine_done')) trigger.morningRoutineDone = false;
                if (row.trig.includes('spf_applied')) {
                    trigger.spfApplied = false;
                    trigger.uvIndex = { gte: 3 };
                }
                if (row.trig.includes('Moins de 4 routines')) trigger.regularityScore = { lte: 50 };
                if (row.trig.includes('26+ routines')) trigger.regularityScore = { gte: 85 };

                return {
                    id: row.srclbl.replace(/ /g, '_').replace(/<|>=|%|/g, '').toLowerCase(),
                    factor: row.f,
                    icon: row.ic,
                    trigger: trigger,
                    advice: {
                        dry: { title: row.dry.t, body: row.dry.a, tip: row.dry.tip },
                        oily: { title: row.oily.t, body: row.oily.a, tip: row.oily.tip },
                        combo: { title: row.combo.t, body: row.combo.a, tip: row.combo.tip },
                        normal: { title: row.normal.t, body: row.normal.a, tip: row.normal.tip }
                    }
                };
            })
        }
    }
};

// Handle G7 (Face Mapping) separately due to its structure
Object.entries(g7.data).forEach(([symptom, zones]) => {
    Object.entries(zones).forEach(([zone, data]) => {
        matrix.groups.g7.scenarios.push({
            id: `mapping_${symptom}_${zone}`,
            factor: `${g7.symptomLabels[symptom]} - ${g7.zoneLabels[zone]}`,
            icon: symptom === "acné" ? "🔴" : (symptom === "taches" ? "🟤" : "🗺️"),
            trigger: {
                symptom: symptom,
                trend: "plus",
                zone: zone
            },
            advice: {
                dry: { title: data.dry.t, body: data.dry.a, tip: data.dry.tip },
                oily: { title: data.oily.t, body: data.oily.a, tip: data.oily.tip },
                combo: { title: data.combo.t, body: data.combo.a, tip: data.combo.tip },
                normal: { title: data.normal.t, body: data.normal.a, tip: data.normal.tip }
            }
        });
    });
});

fs.writeFileSync('/Users/enaselmershati/Desktop/skin/smart-skin-scope/src/data/skincare_matrix_extended.json', JSON.stringify(matrix, null, 2));
console.log('Successfully created skincare_matrix_extended.json');
