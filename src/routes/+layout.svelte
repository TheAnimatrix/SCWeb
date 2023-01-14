<script>
	import './styles.css';
</script>

<div class="app">
	<div class="menuTop">
		<div class="menu">
            <div id="logoContainer">
				<img src="src/libs/svg/logo_main.svg" alt="Selfcrafted Logo"/>
			</div>
            <ul style="list-style: none;">
                <li><p>Crafts</p></li>
                <li><p>About</p></li>
                <li><p>Sell your craft</p></li>
            </ul>
		</div>

		<div class="rest">
			<slot />
		</div>
	</div>
</div>

<style>

    p {
        margin : 6%;
        padding : 3%;
        color: white;
        font-size: 1.7em;
        font-family: figtree;
    }

    p:hover, p:active {
        margin : 6%;
        padding : 3%;
        background-color: white;
        color: black;
        font-size: 1.7em;
        font-family: figtree;
    }

    #logoContainer {
        width : 100%;
        height: auto;
        display: flex;
        justify-content: center;
    }

    img {
        width: 70%;
        height: auto;
        margin-top: 5%;
        object-fit: scale-down;
    }

	.app {
		display: flex;
		flex-direction: column;
		height: 100%;
		background-color: #2c2c2c;
	}

    .menuTop{
        display: flex;
        height: 100%;
    }

    .menu {
        min-width: 0;
        flex : 2;
        display: flex;
        flex-direction: column;
        border : 0px;
        border-right: 3px solid #92cec0;
    }

    .rest {
        flex : 8;
    }

	
</style>
