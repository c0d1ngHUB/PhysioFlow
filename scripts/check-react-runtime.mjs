process.env.NODE_ENV = 'production';

const [{ version: reactVersion }, { version: reactDomVersion }] = await Promise.all([
  import('react'),
  import('react-dom'),
]);

if (reactVersion !== reactDomVersion) {
  throw new Error(
    `React runtime versions must match exactly: react ${reactVersion}, react-dom ${reactDomVersion}`,
  );
}

await Promise.all([import('react-dom/client'), import('react-dom/server')]);

console.log(`React runtime imports passed (${reactVersion})`);
