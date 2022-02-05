export const removeElementFrom = (array, element) => {
  const newArray = []
  array.map((arrayElment, idx) => {
    if (arrayElment !== element) {
      newArray.push(arrayElment)
    }
  })

  return newArray
}

export const removeElementFromBase = (array, element, compare) => {
  const newArray = []
  array.map((arrayElment, idx) => {
    if (!compare(arrayElment, element)) {
      newArray.push(arrayElment)
    }
  })

  return newArray
}

export const mergeElementInto = (array, element) => {
  // state.imageIdsByType[action.payload.fileType].push(action.payload.id)
  const newArray = []

  newArray.push(...array)
  newArray.push(element)

  return newArray
}

export const arrayToString = (array, separator) => {
  let string = ''
  array&&array.map((element, idx) => {
    if (idx > 0) {
      string = string+separator+element
    }
    else {
      string = string + element
    }
  })

  return string
}

export const stringToArray = (string, separator) => {
  return string && string.split(separator)
}


export function not(a, b) {
  return a.filter((value) => b.indexOf(value) === -1);
}

export function intersection(a, b) {
  return a.filter((value) => b.indexOf(value) !== -1);
}

export function union(a, b) {
  return [...a, ...not(b, a)];
}

export function insertAt(arr, idx, item) {
  return [...arr.slice(0, idx),
    item,
  ...arr.slice(idx),
  ]
}