</div> <!-- Fin del contenedor de la aplicación -->

<!-- Scripts JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
<script src="<?php echo $baseUrl; ?>assets/js/script.js"></script>

<?php if (isset($js_adicional)): ?>
    <?php foreach ($js_adicional as $js): ?>
        <?php if (strpos($js, 'http') === 0 || strpos($js, '/') === 0): ?>
            <script src="<?php echo $js; ?>"></script>
        <?php else: ?>
            <script src="<?php echo $baseUrl . $js; ?>"></script>
        <?php endif; ?>
    <?php endforeach; ?>
<?php endif; ?>

</body>

</html>