# Guide d'utilisation d'Ollama en terminal

Ollama est une solution d'IA locale 100% gratuite qui permet d'exécuter des modèles d'IA sur votre machine sans frais ni connexion internet requise après l'installation.

## Installation

### macOS

1. **Téléchargez Ollama** : Visitez [ollama.com](https://ollama.com) et téléchargez la version macOS
2. **Installez** : Ouvrez le fichier `.dmg` téléchargé et suivez les instructions
3. **Vérifiez l'installation** : Ouvrez un terminal et tapez :
   ```bash
   ollama --version
   ```

## Télécharger des modèles

### Modèle de vision (pour analyser des images)

```bash
ollama pull llava
```

### Modèles de texte (pour conversation, analyse, etc.)

```bash
ollama pull llama3.2       # Modèle généraliste
ollama pull mistral        # Alternative
ollama pull codellama      # Pour le code
```

## Utilisation en terminal

### Mode interactif (conversation)

```bash
ollama run llama3.2
```

Vous pourrez alors converser directement avec le modèle.

### Mode direct (une seule question)

```bash
echo "Quelle est la capitale de la France ?" | ollama run llama3.2
```

### Analyser une image (avec Llava)

```bash
ollama run llava "Analyse cette image et décris ce que tu vois" --image /chemin/vers/image.jpg
```

### API locale

Ollama expose également une API locale sur `http://localhost:11434` que vous pouvez utiliser avec curl :

```bash
# Lister les modèles disponibles
curl http://localhost:11434/api/tags

# Générer du texte
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Pourquoi le ciel est bleu ?"
}'
```

## Commandes utiles

```bash
# Lister les modèles installés
ollama list

# Supprimer un modèle
ollama rm llama3.2

# Mettre à jour un modèle
ollama pull llama3.2

# Voir les informations système
ollama ps
```

## Résolution de problèmes

### Ollama ne démarre pas

- Vérifiez que Ollama est installé correctement
- Redémarrez votre Mac si nécessaire
- Vérifiez qu'aucun firewall ne bloque le port 11434

### Le modèle n'est pas trouvé

```bash
# Liste des modèles installés
ollama list

# Télécharger un modèle manquant
ollama pull <nom_du_modele>
```

### Erreur de mémoire

Si vous n'avez pas assez de RAM pour les gros modèles :

```bash
# Utilisez des versions plus légères (quantifiées)
ollama pull llama3.2:1b    # Version très légère
ollama pull llama3.2:3b    # Version légère
```

## Avantages

- **100% gratuit** : Aucun frais d'API
- **Privé** : Vos données ne quittent jamais votre machine
- **Pas de connexion internet requise** : Fonctionne hors ligne après l'installation
- **Personnalisable** : Vous pouvez utiliser d'autres modèles si nécessaire
