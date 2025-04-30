</div> <!-- Fin del contenedor de la aplicación -->

<!-- Scripts JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
<script src="<?php echo $baseUrl; ?>assets/js/script.js"></script>
<script src="<?php echo $baseUrl; ?>assets/js/spa-navigation.js"></script>

<?php if (isset($js_adicional)): ?>
    <?php foreach ($js_adicional as $js): ?>
        <?php if (strpos($js, 'http') === 0 || strpos($js, '/') === 0): ?>
            <script src="<?php echo $js; ?>"></script>
        <?php else: ?>
            <script src="<?php echo $baseUrl . $js; ?>"></script>
        <?php endif; ?>
    <?php endforeach; ?>
<?php endif; ?>

<script>
    // Código para depurar problemas de SPA
    console.log("Footer cargado. Verificando enlaces SPA...");
    document.addEventListener("DOMContentLoaded", function() {
        const spaLinks = document.querySelectorAll("[data-spa-link]");
        console.log("Total de enlaces SPA encontrados:", spaLinks.length);

        // Monitorear uso de memoria
        if (window.performance && window.performance.memory) {
            setInterval(function() {
                const memoryInfo = window.performance.memory;
                console.log("Uso de memoria:",
                    Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024)) + "MB",
                    "de",
                    Math.round(memoryInfo.jsHeapSizeLimit / (1024 * 1024)) + "MB");
            }, 10000); // Cada 10 segundos
        }
    });
</script>
</body>

</html>