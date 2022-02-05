import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry"
import {
    insertAt,
} from 'app/web/reducers/utils/arrayUtils'

// Check more APIs from https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html
export const processPdfTextItems = (pdfFile, callbackOnItem) => {
    // In the new pdfjs-dist, it will rely on the worker to read and parse pdf file, so it is needed to
    // indicate the worker for the engine. In other words, the workder is customizable if you need.
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

    // pdfjs will treat the path as url path, which means if pass in the /localdisk/mypdf.pdf
    // the path will be translated to https://server/localdisk/mypdf.pdf, which you can debug .getDocument() api to
    // know more details. 
    // To load and parse local files, it will be passed as the array. Here using FileReader() to read the file into
    // array to pass into the pdfjs.
    const fileReader = new FileReader()

    // It reads file in async way, so that give it callback method when file is read
    fileReader.onload = function() {

        //Step 4:turn array buffer into typed array
        const typedArray = new Uint8Array(this.result)

        //Step 5:pdfjs will read the the file array
        const pdfDoc = pdfjsLib.getDocument(typedArray)
        pdfDoc.promise.then(pdf => {
            const pages = pdf._pdfInfo.numPages
            let pageIndex = 1
            while (pageIndex <= pages) {

                pdf.getPage(pageIndex)
                .then(page => {
                    page.getTextContent()
                    .then(textConten => {
                        textConten.items.map(item => {
                            // console.log(item.str)
                            callbackOnItem && callbackOnItem(item.str)
                        })
                    })
                })

                pageIndex += 1
            }

        })               
    }

    // Once defined the callback for onload, pass the file object to the fileReader.
    fileReader.readAsArrayBuffer(pdfFile)
}

// Wrap file reader into promise so that can call it in the sync way with await
// function readFilePromise(file) {
const readFilePromise = file => {
    // read file, if onerror triggered, goes to reject routine, the .catch(err=>{})
    // if onload triggered, goes to resolve routine, the .then(ret=>{})
    // When call the promise with with await, it will execute the resolve and return
    // whatever passed into resolve or reject
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader()
        fileReader.onerror = reject
        fileReader.onload = () => {
            resolve(fileReader.result)
        }
        fileReader.readAsArrayBuffer(file)
    })
}

//export async function loadAndParsePdf(pdfFile) {
export const parsePdfIntoTextArray = async pdfFile => {
    // Call in await pattern to get the result.
    const fileArray = await readFilePromise(pdfFile)
    if (fileArray instanceof ArrayBuffer) {

        const typedArray = new Uint8Array(fileArray)
        const texts = []
    
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
        const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
        const pageNumber = pdfDoc._pdfInfo.numPages
        let pageIndex = 1
        while (pageIndex <= pageNumber) {

            const page = await pdfDoc.getPage(pageIndex)
            const content = await page.getTextContent()
            // Each map return an array contains each returned item.str, so here flat the array and push all elements to
            // the texts array.
            texts.push(...content.items.map(item => {
                return item.str
            }))
            pageIndex += 1
        }
    
        return texts
    }
    else {
        return []
    }
}

// read the pdf into lines and rows.
export const parsePdfIntoLinesAndRows = async pdfFile => {
    /*
    const pdfDocStructure = {
        pageNumber: 3,
        // Lines of each page
        linesInPages: [
            [
                {// each line, mark the y and left x, rows contains each item sorted on x from left to right
                    lineAverageY: 0,
                    lineLeftX: 0,
                    itemsLeftToRight: [item1, item2,],
                },
                {},], // Page 1
            [{}, {},],// Page 2
            [{},]], // Page 3
        ...
    } */
    const pdfDocStructure = {
        pageNumber: 0,
        linesInPages: [],
    }

    // Call in await pattern to get the result.
    const fileArray = await readFilePromise(pdfFile)
    if (fileArray instanceof ArrayBuffer) {

        const typedArray = new Uint8Array(fileArray)

        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
        const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;

        const pageNumber = pdfDoc._pdfInfo.numPages
        pdfDocStructure.pageNumber = pageNumber

        let pageIndex = 1
        while (pageIndex <= pageNumber) {

            const page = await pdfDoc.getPage(pageIndex)
            const content = await page.getTextContent()
            pdfDocStructure.linesInPages[pageIndex-1] = []
            // Each map return an array contains each returned item.str, so here flat the array and push all elements to
            // the texts array.
            for (let idx = 0; idx < content.items.length; idx++) {
                const item = content.items[idx]

                // Find the line to join
                let addedToLine = false
                const totalLineNumber = pdfDocStructure.linesInPages[pageIndex - 1].length
                let lineIdxToBreak = totalLineNumber
                for (let lineIdx = 0; lineIdx < totalLineNumber; lineIdx++) {
                    const line = pdfDocStructure.linesInPages[pageIndex - 1][lineIdx]
                    const lineY = line.lineAverageY
                    const difference = item.transform[5] - lineY
                    if (Math.abs(difference) <= 1) {
                        // if the difference is less than 1, it goes to the same line
                        // update new y value
                        const currentItemsNumber = line.itemsLeftToRight.length
                        const newY = (lineY * currentItemsNumber + item.transform[5]) / (currentItemsNumber + 1)
                        line.lineAverageY = newY
                        if (line.lineLeftX > item.transform[4]) {
                            line.lineLeftX = item.transform[4]
                        }
                        // add the item into the line, sort from less x to greater x
                        line.itemsLeftToRight.push(item)
                        line.itemsLeftToRight.sort(function (a, b) {
                            return a.transform[4] - b.transform[4]
                        })
                        addedToLine = true
                        break;
                    }
                    else if (item.transform[5] > lineY) {
                        // if the new tiem is higher than the current line, then insert the new line before the lineIdx
                        lineIdxToBreak = lineIdx
                        break;
                    }
                }

                if (!addedToLine) {
                    // If there is no line at the same Y, then creat new line and add it to the lines of the currecnt page
                    const line = {
                        lineAverageY: item.transform[5],
                        lineLeftX: item.transform[4],
                        itemsLeftToRight: [item,],
                    }

                    pdfDocStructure.linesInPages[pageIndex - 1] = insertAt(pdfDocStructure.linesInPages[pageIndex - 1],
                        lineIdxToBreak,
                        line
                    )
                }
            }

            pageIndex += 1
        }

    }

    return pdfDocStructure
}