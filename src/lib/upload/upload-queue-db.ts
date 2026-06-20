const DB_NAME = "ra-upload-queue";
const DB_VERSION = 1;
const FILE_STORE = "files";

type StoredUploadFile = {
  id: string;
  file: File;
  createdAt: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB error"));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction error"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openUploadQueueDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB indisponivel"));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(FILE_STORE)) {
          db.createObjectStore(FILE_STORE, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB open error"));
    });
  }

  return dbPromise;
}

export async function putUploadFile(id: string, file: File) {
  const db = await openUploadQueueDb();
  const transaction = db.transaction(FILE_STORE, "readwrite");
  transaction.objectStore(FILE_STORE).put({
    id,
    file,
    createdAt: new Date().toISOString(),
  } satisfies StoredUploadFile);

  await transactionDone(transaction);
}

export async function getUploadFile(id: string) {
  const db = await openUploadQueueDb();
  const transaction = db.transaction(FILE_STORE, "readonly");
  const record = await requestToPromise<StoredUploadFile | undefined>(
    transaction.objectStore(FILE_STORE).get(id),
  );

  return record?.file ?? null;
}

export async function deleteUploadFile(id: string) {
  const db = await openUploadQueueDb();
  const transaction = db.transaction(FILE_STORE, "readwrite");
  transaction.objectStore(FILE_STORE).delete(id);

  await transactionDone(transaction);
}

export async function deleteUploadFiles(ids: string[]) {
  if (!ids.length) return;

  const db = await openUploadQueueDb();
  const transaction = db.transaction(FILE_STORE, "readwrite");
  const store = transaction.objectStore(FILE_STORE);

  for (const id of ids) {
    store.delete(id);
  }

  await transactionDone(transaction);
}
