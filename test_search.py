from app import search_tramites

tests = [
    'tengo que renovar el DNI',
    'quiero darme de baja de la luz',
    'el casero no me devuelve la fianza',
    'cobrar el paro',
    'quitar movistar',
    'compra rota',
    'empadronarme piso',
    'cita nie',
    'cancelar gimnasio'
]

print("=== RESULTADOS DE BÚSQUEDA EN LENGUAJE NATURAL ===")
for q in tests:
    res = search_tramites(q)
    if res:
        print(f"Búsqueda: '{q}' -> Encontrado: '{res[0]['titulo']}' (id: {res[0]['id']})")
    else:
        print(f"Búsqueda: '{q}' -> SIN RESULTADOS")
