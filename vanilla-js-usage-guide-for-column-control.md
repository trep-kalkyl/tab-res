# Ultra-Lightweight columnControls

En minimal kolumnkontroll för TabulatorJS - ren vanilla JavaScript utan beroenden.

## Filstruktur  

Ultra-lightweight implementeringen består av endast:

1. `public/js/columnControls.js` - Komplett funktionalitet i en enda fil (119 rader)

## Installation

1. Kopiera filen till ditt projekt:
   - `public/js/columnControls.js`

2. Inkludera den i din HTML-fil:

```html
<script src="js/columnControls.js"></script>
```

**Det är allt!** Ingen bundling, inga beroenden, ingen konfiguration.

## Grundläggande användning

```html
<!DOCTYPE html>
<html>
<head>
    <link href="https://unpkg.com/tabulator-tables@6.3.1/dist/css/tabulator.min.css" rel="stylesheet">
</head>
<body>
    <div id="example-table"></div>

    <script src="https://unpkg.com/tabulator-tables@6.3.1/dist/js/tabulator.min.js"></script>
    <script src="js/columnControls.js"></script>

    <script>
        // Exempeldata
        const tableData = [
            {id: 1, name: "Alice Johnson", age: 29, city: "Stockholm", email: "alice@example.com", department: "IT"},
            {id: 2, name: "Bob Smith", age: 34, city: "Göteborg", email: "bob@example.com", department: "Sales"},
            {id: 3, name: "Carol Davis", age: 28, city: "Malmö", email: "carol@example.com", department: "HR"}
        ];

        // Initialisera Tabulator med några kolumner dolda från början
        const table = new Tabulator("#example-table", {
            data: tableData,
            columns: [
                {title: "Namn", field: "name"},
                {title: "Ålder", field: "age"}, 
                {title: "Stad", field: "city"},
                {title: "Email", field: "email", visible: false},  // Dold från början
                {title: "Avdelning", field: "department", visible: false}  // Dold från början
            ],
            layout: "fitColumns",
            pagination: true,
            paginationSize: 10
        });

        // Lägg till kolumnkontroller
        new TabulatorColumnControls(table, {
            buttonText: "Kolumner"  // Valfri knapptext
        });
    </script>
</body>
</html>
```

## Konfigurationsalternativ

### Kolumnkontroller

Du kan anpassa kolumnkontrollerna med dessa alternativ:

- `buttonText` - Text som visas på knappen (standard: "Kolumner")

**Det är allt!** Minimal konfiguration för maximal enkelhet.

### Dölja Kolumner från Början

För att göra kolumner dolda när tabellen laddas, använd `visible: false` i kolumndefinitionen:

```javascript
columns: [
    {title: "Namn", field: "name"},
    {title: "Email", field: "email", visible: false},     // Dold från början
    {title: "Telefon", field: "phone", visible: false},   // Dold från början
    {title: "Stad", field: "city"}
]
```

**Fördelar:**
- Användarna kan välja vilka kolumner de vill se
- Tabellen blir mindre rörig vid första intryck
- Perfekt för tabeller med många kolumner
- Kolumnkontrollerna visar automatiskt rätt tillstånd

## API Referens

### TabulatorColumnControls

#### Konstruktor
```javascript
new TabulatorColumnControls(tabulatorInstance, options)
```

**Parametrar:**
- `tabulatorInstance` (Tabulator): TabulatorJS-instans
- `options` (Object): Konfigurationsalternativ (valfritt)

**Options:**
```javascript
{
    buttonText: 'Kolumner'  // Text på dropdown-knappen
}
```

#### Metoder

**`toggle()`**
Togglar dropdown-menyn (öppnar/stänger).

```javascript
columnControls.toggle();
```

**`close()`**
Stänger dropdown-menyn.

```javascript
columnControls.close();
```

**`destroy()`**
Rensar alla DOM-element och event listeners.

```javascript
columnControls.destroy();
```

## Funktioner

- **Ultra-lightweight**: Bara 119 rader ren vanilla JavaScript  
- **Inga beroenden**: Fungerar direkt utan externa bibliotek
- **Enkel integration**: Fungerar med alla Tabulator-instanser
- **Minimal CSS**: Alla stilar inbakade i koden
- **Clean kod**: Välstrukturerad och underhållbar
- **Automatisk cleanup**: Hanterar event listeners och DOM korrekt

## Tekniska detaljer

- **Filstorlek**: Under 3KB
- **Beroenden**: Inga (endast TabulatorJS)
- **Webbläsarstöd**: Alla moderna webbläsare (ES6+)
- **Performance**: Minimal påverkan på sidladdning
- **Memory**: Automatisk cleanup vid förstöring

## Styling

Klassen injicerar automatiskt minimal CSS med dessa klasser:

```css
.column-controls          /* Container */
.cc-btn                  /* Toggle-knapp */
.cc-menu                 /* Dropdown-meny */
.cc-header               /* Meny-header */
.cc-item                 /* Kolumn-item (checkbox + label) */
```

### Anpassa styling

```css
/* Överskrid standardstilarna */
.cc-btn {
    background: #your-color !important;
    border-color: #your-border !important;
}

.cc-menu {
    box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
}

.cc-item:hover {
    background: #your-hover-color !important;
}
```

## React Integration

För React-projekt använd wrapper-komponenten:

```tsx
import { TabulatorColumnControls } from './columnControls.js';

// I din React-komponent
useEffect(() => {
    if (tabulator.current) {
        const columnControls = new TabulatorColumnControls(
            tabulator.current, 
            { buttonText: "Columns" }
        );
        
        return () => columnControls.destroy(); // Cleanup
    }
}, []);
```

## Flera Tabeller på Samma Sida

När du har flera tabeller på samma sida, skapa en separat instans för varje tabell:

### Vanilla JavaScript

```javascript
// Tabell 1
const table1 = new Tabulator("#table1", {
    data: data1,
    columns: columns1,
    layout: "fitColumns"
});

const controls1 = new TabulatorColumnControls(table1, {
    buttonText: "Kolumner Tabell 1"
});

// Tabell 2  
const table2 = new Tabulator("#table2", {
    data: data2,
    columns: columns2,
    layout: "fitColumns"
});

const controls2 = new TabulatorColumnControls(table2, {
    buttonText: "Kolumner Tabell 2"
});

// Cleanup när sidan laddas om
window.addEventListener('beforeunload', () => {
    controls1.destroy();
    controls2.destroy();
});
```

### React - Flera DataTable-komponenter

```tsx
function App() {
    return (
        <div>
            <h2>Användare</h2>
            <DataTable 
                data={userData} 
                columns={userColumns}
                columnControlsOptions={{ buttonText: "Användarkolumner" }}
            />
            
            <h2>Produkter</h2>
            <DataTable 
                data={productData} 
                columns={productColumns}
                columnControlsOptions={{ buttonText: "Produktkolumner" }}
            />
        </div>
    );
}
```

### React - Dynamiska Tabeller

```tsx
function MultiTableView({ tables }) {
    return (
        <div>
            {tables.map((tableConfig, index) => (
                <div key={tableConfig.id} className="mb-8">
                    <h3>{tableConfig.title}</h3>
                    <DataTable
                        data={tableConfig.data}
                        columns={tableConfig.columns}
                        columnControlsOptions={{ 
                            buttonText: `Kolumner ${tableConfig.title}` 
                        }}
                    />
                </div>
            ))}
        </div>
    );
}
```

**Viktiga punkter för flera tabeller:**

- ✅ Varje tabell får automatiskt sina egna unika DOM-element
- ✅ Kolumnkontrollerna fungerar oberoende för varje tabell
- ✅ Cleanup hanteras automatiskt i React
- ✅ Inga ID-konflikter mellan tabeller
- ✅ Olika knapptexter för att skilja tabellerna åt

## Browser-kompatibilitet

- Chrome 60+
- Firefox 55+  
- Safari 12+
- Edge 79+

Använder moderna JavaScript-funktioner:
- ES6 Classes
- Template literals
- Arrow functions
- Modern DOM API

## Felsökning

### Vanliga Problem

1. **Knappen visas inte**
   - Kontrollera att scriptet laddas före tabellen initialiseras
   - Verifiera att `window.TabulatorColumnControls` finns

2. **Dropdown syns inte**
   - Kontrollera z-index konflikter
   - Verifiera att parent-element inte har `overflow: hidden`

3. **Styling ser fel ut**
   - Använd `!important` för att överskriva befintliga stilar
   - Kontrollera CSS-specificitet

### Debug

```javascript
// Kontrollera att klassen är tillgänglig
console.log('TabulatorColumnControls loaded:', window.TabulatorColumnControls);

// Verifiera att tabellen är redo
table.on("tableBuilt", () => {
    console.log("Table ready for column controls");
});
```

## Fördelar med Ultra-Lightweight

**Jämfört med den tidigare multi-fil implementeringen:**

- **90% mindre kod** - Från 3 filer till 1 fil
- **Enklare installation** - Bara en `<script>`-tagg
- **Snabbare laddning** - Färre HTTP-requests
- **Lättare underhåll** - All logik i en fil
- **Mindre komplexitet** - Inga interna beroenden

**Perfekt för:**
- Prototyper och MVP:s
- Enkla datatabeller
- När bundle-storlek spelar roll
- Vanilla JS-projekt
- Minimal footprint-krav
